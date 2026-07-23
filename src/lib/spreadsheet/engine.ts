// Minimal spreadsheet engine — cell refs, ranges, cross-sheet refs, functions,
// auto-recalc via topological pass with cycle detection.

export type CellValue = string | number | boolean | null;
export type CellStyle = {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  align?: 'left' | 'center' | 'right';
  bg?: string;
  color?: string;
};
export type Cell = { raw: string; style?: CellStyle }; // raw stores formula (starting "=") or literal
export type SheetData = { name: string; cells: Record<string, Cell>; cols: number; rows: number; freezeRow?: number; freezeCol?: number; colWidths?: Record<number, number> };
export type Workbook = { sheets: SheetData[]; activeSheetId?: number };

const COL_RE = /^[A-Z]+$/;

export function colToLetter(c: number): string {
  let s = ''; c = c + 1;
  while (c > 0) { const r = (c - 1) % 26; s = String.fromCharCode(65 + r) + s; c = Math.floor((c - 1) / 26); }
  return s;
}
export function letterToCol(l: string): number {
  let n = 0; for (const ch of l.toUpperCase()) { if (ch < 'A' || ch > 'Z') return -1; n = n * 26 + (ch.charCodeAt(0) - 64); }
  return n - 1;
}
export function addrToRC(a: string): { r: number; c: number } | null {
  const m = /^([A-Z]+)(\d+)$/.exec(a.toUpperCase());
  if (!m) return null;
  const c = letterToCol(m[1]); const r = parseInt(m[2], 10) - 1;
  if (c < 0 || r < 0) return null;
  return { r, c };
}
export function rcToAddr(r: number, c: number): string { return `${colToLetter(c)}${r + 1}`; }

// ---- Tokenizer & parser (Pratt-ish, small) ----
type Tok = { t: 'num' | 'str' | 'ref' | 'range' | 'op' | 'lp' | 'rp' | 'comma' | 'fn' | 'bool'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = []; let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t') { i++; continue; }
    if (ch === '"') {
      let j = i + 1; let s = '';
      while (j < src.length && src[j] !== '"') { s += src[j]; j++; }
      out.push({ t: 'str', v: s }); i = j + 1; continue;
    }
    if (/[0-9.]/.test(ch)) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: 'num', v: src.slice(i, j) }); i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      let word = src.slice(i, j);
      // Sheet-qualified ref: Word!A1 or 'Word Two'!A1  — but Word alone here; sheet parsing handled below
      // Check for range/ref: A1, A1:B2, A:A
      if (COL_RE.test(word)) {
        if (src[j] && /[0-9]/.test(src[j])) {
          let k = j; while (k < src.length && /[0-9]/.test(src[k])) k++;
          const addr = word + src.slice(j, k);
          if (src[k] === ':') {
            let m = k + 1;
            let letters = ''; while (m < src.length && /[A-Za-z]/.test(src[m])) { letters += src[m]; m++; }
            let digits = ''; while (m < src.length && /[0-9]/.test(src[m])) { digits += src[m]; m++; }
            out.push({ t: 'range', v: `${addr}:${letters.toUpperCase()}${digits}` });
            i = m; continue;
          }
          out.push({ t: 'ref', v: addr }); i = k; continue;
        }
        // Column-only range like A:A
        if (src[j] === ':') {
          let m = j + 1; let letters = ''; while (m < src.length && /[A-Za-z]/.test(src[m])) { letters += src[m]; m++; }
          out.push({ t: 'range', v: `${word}:${letters.toUpperCase()}` });
          i = m; continue;
        }
      }
      const up = word.toUpperCase();
      if (up === 'TRUE' || up === 'FALSE') { out.push({ t: 'bool', v: up }); i = j; continue; }
      // Function name if next is '('
      // Skip spaces
      let k = j; while (src[k] === ' ') k++;
      if (src[k] === '(') { out.push({ t: 'fn', v: up }); i = k; continue; }
      out.push({ t: 'ref', v: up }); i = j; continue;
    }
    if (ch === '\'') {
      // 'Sheet name'!A1 style — capture as ref token with sheet prefix
      let j = i + 1; let name = '';
      while (j < src.length && src[j] !== '\'') { name += src[j]; j++; }
      j++; // skip closing '
      if (src[j] === '!') {
        j++;
        let letters = ''; while (j < src.length && /[A-Za-z]/.test(src[j])) { letters += src[j]; j++; }
        let digits = ''; while (j < src.length && /[0-9]/.test(src[j])) { digits += src[j]; j++; }
        const addr = `'${name}'!${letters.toUpperCase()}${digits}`;
        if (src[j] === ':') {
          j++;
          let l2 = ''; while (j < src.length && /[A-Za-z]/.test(src[j])) { l2 += src[j]; j++; }
          let d2 = ''; while (j < src.length && /[0-9]/.test(src[j])) { d2 += src[j]; j++; }
          out.push({ t: 'range', v: `${addr}:${l2.toUpperCase()}${d2}` });
        } else out.push({ t: 'ref', v: addr });
        i = j; continue;
      }
      i = j; continue;
    }
    if (ch === '!') { i++; continue; } // handled inline
    if (ch === '(') { out.push({ t: 'lp', v: ch }); i++; continue; }
    if (ch === ')') { out.push({ t: 'rp', v: ch }); i++; continue; }
    if (ch === ',') { out.push({ t: 'comma', v: ch }); i++; continue; }
    if ('+-*/^%&<>='.includes(ch)) {
      let op = ch;
      if ((ch === '<' || ch === '>') && src[i + 1] === '=') { op = ch + '='; i++; }
      else if (ch === '<' && src[i + 1] === '>') { op = '<>'; i++; }
      out.push({ t: 'op', v: op }); i++; continue;
    }
    // Handle Sheet!A1 (unquoted sheet name)
    // fallback skip
    i++;
  }
  // Second pass: merge REF tokens like SheetName + ! + A1
  const merged: Tok[] = [];
  for (let k = 0; k < out.length; k++) {
    const t = out[k];
    const nxt = out[k + 1];
    // "ref" followed by ref/range where original src had "!" between — approximate by checking value shape isn't A1
    if (t.t === 'ref' && !/^[A-Z]+\d+$/.test(t.v) && nxt && (nxt.t === 'ref' || nxt.t === 'range')) {
      merged.push({ t: nxt.t, v: `${t.v}!${nxt.v}` });
      k++; continue;
    }
    merged.push(t);
  }
  return merged;
}

type Node =
  | { k: 'num'; v: number }
  | { k: 'str'; v: string }
  | { k: 'bool'; v: boolean }
  | { k: 'ref'; v: string }
  | { k: 'range'; v: string }
  | { k: 'bin'; op: string; a: Node; b: Node }
  | { k: 'un'; op: string; a: Node }
  | { k: 'fn'; name: string; args: Node[] };

function parse(toks: Tok[]): Node {
  let p = 0;
  const peek = () => toks[p];
  const eat = (t?: string, v?: string) => { const x = toks[p]; if (!x) return null; if (t && x.t !== t) return null; if (v && x.v !== v) return null; p++; return x; };

  const parseExpr = (): Node => parseCmp();
  const parseCmp = (): Node => {
    let l = parseAdd();
    while (peek() && peek().t === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(peek().v)) {
      const op = eat('op')!.v; const r = parseAdd(); l = { k: 'bin', op, a: l, b: r };
    }
    return l;
  };
  const parseAdd = (): Node => {
    let l = parseMul();
    while (peek() && peek().t === 'op' && (peek().v === '+' || peek().v === '-' || peek().v === '&')) {
      const op = eat('op')!.v; const r = parseMul(); l = { k: 'bin', op, a: l, b: r };
    }
    return l;
  };
  const parseMul = (): Node => {
    let l = parsePow();
    while (peek() && peek().t === 'op' && (peek().v === '*' || peek().v === '/' || peek().v === '%')) {
      const op = eat('op')!.v; const r = parsePow(); l = { k: 'bin', op, a: l, b: r };
    }
    return l;
  };
  const parsePow = (): Node => {
    let l = parseUn();
    while (peek() && peek().t === 'op' && peek().v === '^') { eat('op'); const r = parseUn(); l = { k: 'bin', op: '^', a: l, b: r }; }
    return l;
  };
  const parseUn = (): Node => {
    if (peek() && peek().t === 'op' && (peek().v === '-' || peek().v === '+')) {
      const op = eat('op')!.v; return { k: 'un', op, a: parseUn() };
    }
    return parsePrim();
  };
  const parsePrim = (): Node => {
    const t = peek(); if (!t) throw new Error('unexpected end');
    if (t.t === 'num') { p++; return { k: 'num', v: parseFloat(t.v) }; }
    if (t.t === 'str') { p++; return { k: 'str', v: t.v }; }
    if (t.t === 'bool') { p++; return { k: 'bool', v: t.v === 'TRUE' }; }
    if (t.t === 'ref') { p++; return { k: 'ref', v: t.v }; }
    if (t.t === 'range') { p++; return { k: 'range', v: t.v }; }
    if (t.t === 'lp') { p++; const e = parseExpr(); if (peek()?.t !== 'rp') throw new Error('missing )'); p++; return e; }
    if (t.t === 'fn') {
      p++; if (peek()?.t !== 'lp') throw new Error('expected ('); p++;
      const args: Node[] = [];
      if (peek()?.t !== 'rp') {
        args.push(parseExpr());
        while (peek()?.t === 'comma') { p++; args.push(parseExpr()); }
      }
      if (peek()?.t !== 'rp') throw new Error('missing )'); p++;
      return { k: 'fn', name: t.v, args };
    }
    throw new Error('unexpected token ' + t.t);
  };
  return parseExpr();
}

// Split "SheetName!ADDR" -> { sheet, addr }
function splitSheetRef(ref: string): { sheet?: string; addr: string } {
  const m = /^(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))!(.+)$/.exec(ref);
  if (m) return { sheet: (m[1] || m[2])!, addr: m[3] };
  return { addr: ref };
}

function expandRange(range: string, sheet: SheetData): string[] {
  // Handles A1:B3, A:A, 1:1
  const { sheet: sn, addr } = splitSheetRef(range);
  const parts = addr.split(':');
  const cellsPrefix = sn ? `'${sn}'!` : '';
  if (parts.length !== 2) return [];
  const [a, b] = parts;
  // Column-only
  if (COL_RE.test(a) && COL_RE.test(b)) {
    const c1 = letterToCol(a), c2 = letterToCol(b);
    const out: string[] = [];
    for (let c = Math.min(c1, c2); c <= Math.max(c1, c2); c++)
      for (let r = 0; r < sheet.rows; r++) out.push(cellsPrefix + rcToAddr(r, c));
    return out;
  }
  if (/^\d+$/.test(a) && /^\d+$/.test(b)) {
    const r1 = parseInt(a) - 1, r2 = parseInt(b) - 1;
    const out: string[] = [];
    for (let r = Math.min(r1, r2); r <= Math.max(r1, r2); r++)
      for (let c = 0; c < sheet.cols; c++) out.push(cellsPrefix + rcToAddr(r, c));
    return out;
  }
  const A = addrToRC(a), B = addrToRC(b);
  if (!A || !B) return [];
  const out: string[] = [];
  for (let r = Math.min(A.r, B.r); r <= Math.max(A.r, B.r); r++)
    for (let c = Math.min(A.c, B.c); c <= Math.max(A.c, B.c); c++)
      out.push(cellsPrefix + rcToAddr(r, c));
  return out;
}

// ---- Evaluator ----
class EvalError extends Error { constructor(public code: string) { super(code); } }

function toNum(v: CellValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (v === null || v === '') return 0;
  const n = parseFloat(String(v));
  if (isNaN(n)) throw new EvalError('#VALUE!');
  return n;
}
function toBool(v: CellValue): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  return !!v && v !== 'FALSE';
}

function evalNode(node: Node, wb: Workbook, curSheet: SheetData, resolved: Map<string, CellValue>): CellValue {
  const resolveRef = (ref: string): CellValue => {
    const { sheet: sn, addr } = splitSheetRef(ref);
    const target = sn ? wb.sheets.find(s => s.name.toLowerCase() === sn.toLowerCase()) : curSheet;
    if (!target) throw new EvalError('#REF!');
    const key = `${target.name}!${addr}`;
    if (resolved.has(key)) return resolved.get(key)!;
    const cell = target.cells[addr];
    if (!cell) return null;
    return evalCell(cell.raw, wb, target, resolved, key);
  };
  switch (node.k) {
    case 'num': return node.v;
    case 'str': return node.v;
    case 'bool': return node.v;
    case 'ref': return resolveRef(node.v);
    case 'range': throw new EvalError('#VALUE!'); // range not usable in scalar context
    case 'un': { const v = toNum(evalNode(node.a, wb, curSheet, resolved)); return node.op === '-' ? -v : v; }
    case 'bin': {
      if (node.op === '&') return String(evalNode(node.a, wb, curSheet, resolved) ?? '') + String(evalNode(node.b, wb, curSheet, resolved) ?? '');
      const a = evalNode(node.a, wb, curSheet, resolved); const b = evalNode(node.b, wb, curSheet, resolved);
      if (['=', '<>', '<', '>', '<=', '>='].includes(node.op)) {
        const na = typeof a === 'number' ? a : parseFloat(String(a));
        const nb = typeof b === 'number' ? b : parseFloat(String(b));
        const bothNum = !isNaN(na) && !isNaN(nb);
        const va: any = bothNum ? na : a; const vb: any = bothNum ? nb : b;
        switch (node.op) {
          case '=': return va === vb;
          case '<>': return va !== vb;
          case '<': return va < vb;
          case '>': return va > vb;
          case '<=': return va <= vb;
          case '>=': return va >= vb;
        }
      }
      const na = toNum(a), nb = toNum(b);
      switch (node.op) {
        case '+': return na + nb;
        case '-': return na - nb;
        case '*': return na * nb;
        case '/': if (nb === 0) throw new EvalError('#DIV/0!'); return na / nb;
        case '%': return na % nb;
        case '^': return Math.pow(na, nb);
      }
      throw new EvalError('#VALUE!');
    }
    case 'fn': {
      const name = node.name;
      const collect = (): CellValue[] => {
        const out: CellValue[] = [];
        for (const a of node.args) {
          if (a.k === 'range') for (const addr of expandRange(a.v, curSheet)) {
            const { sheet: sn, addr: pure } = splitSheetRef(addr);
            const target = sn ? wb.sheets.find(s => s.name.toLowerCase() === sn.toLowerCase()) : curSheet;
            if (!target) continue;
            const cell = target.cells[pure]; out.push(cell ? evalCell(cell.raw, wb, target, resolved, `${target.name}!${pure}`) : null);
          } else out.push(evalNode(a, wb, curSheet, resolved));
        }
        return out;
      };
      const nums = () => collect().map(v => (v === null || v === '') ? null : v).filter(v => v !== null).map(v => toNum(v as CellValue));
      switch (name) {
        case 'SUM': return nums().reduce((s, x) => s + x, 0);
        case 'AVG': case 'AVERAGE': { const a = nums(); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0; }
        case 'MIN': { const a = nums(); return a.length ? Math.min(...a) : 0; }
        case 'MAX': { const a = nums(); return a.length ? Math.max(...a) : 0; }
        case 'COUNT': return nums().length;
        case 'COUNTA': return collect().filter(v => v !== null && v !== '').length;
        case 'IF': { const c = toBool(evalNode(node.args[0], wb, curSheet, resolved)); return evalNode(c ? node.args[1] : node.args[2], wb, curSheet, resolved); }
        case 'AND': return collect().every(v => toBool(v));
        case 'OR': return collect().some(v => toBool(v));
        case 'NOT': return !toBool(evalNode(node.args[0], wb, curSheet, resolved));
        case 'ROUND': { const n = toNum(evalNode(node.args[0], wb, curSheet, resolved)); const d = node.args[1] ? toNum(evalNode(node.args[1], wb, curSheet, resolved)) : 0; const p = Math.pow(10, d); return Math.round(n * p) / p; }
        case 'ABS': return Math.abs(toNum(evalNode(node.args[0], wb, curSheet, resolved)));
        case 'CONCAT': case 'CONCATENATE': return collect().map(v => String(v ?? '')).join('');
        case 'LEN': return String(evalNode(node.args[0], wb, curSheet, resolved) ?? '').length;
        case 'LEFT': { const s = String(evalNode(node.args[0], wb, curSheet, resolved) ?? ''); const n = node.args[1] ? toNum(evalNode(node.args[1], wb, curSheet, resolved)) : 1; return s.slice(0, n); }
        case 'RIGHT': { const s = String(evalNode(node.args[0], wb, curSheet, resolved) ?? ''); const n = node.args[1] ? toNum(evalNode(node.args[1], wb, curSheet, resolved)) : 1; return s.slice(-n); }
        case 'MID': { const s = String(evalNode(node.args[0], wb, curSheet, resolved) ?? ''); const st = toNum(evalNode(node.args[1], wb, curSheet, resolved)); const l = toNum(evalNode(node.args[2], wb, curSheet, resolved)); return s.substr(st - 1, l); }
        case 'LOWER': return String(evalNode(node.args[0], wb, curSheet, resolved) ?? '').toLowerCase();
        case 'UPPER': return String(evalNode(node.args[0], wb, curSheet, resolved) ?? '').toUpperCase();
        case 'TODAY': return new Date().toISOString().slice(0, 10);
        case 'NOW': return new Date().toISOString();
      }
      throw new EvalError('#NAME?');
    }
  }
}

function evalCell(raw: string, wb: Workbook, sheet: SheetData, resolved: Map<string, CellValue>, key?: string): CellValue {
  const k = key || 'anon';
  if (resolved.has(k)) return resolved.get(k)!;
  // Cycle detection: sentinel
  if ((resolved as any)._pending?.has(k)) throw new EvalError('#CIRC!');
  (resolved as any)._pending = (resolved as any)._pending || new Set<string>();
  (resolved as any)._pending.add(k);
  let val: CellValue;
  try {
    if (!raw || raw === '') val = null;
    else if (raw.startsWith('=')) {
      const ast = parse(tokenize(raw.slice(1)));
      val = evalNode(ast, wb, sheet, resolved);
    } else {
      const n = parseFloat(raw);
      val = (!isNaN(n) && String(n) === raw.trim()) ? n : raw;
    }
  } catch (e) {
    val = e instanceof EvalError ? e.code : '#ERROR!';
  } finally {
    (resolved as any)._pending.delete(k);
  }
  resolved.set(k, val);
  return val;
}

// Compute values for every cell in workbook.
export function computeWorkbook(wb: Workbook): Map<string, CellValue> {
  const out = new Map<string, CellValue>();
  for (const sh of wb.sheets) {
    for (const [addr, cell] of Object.entries(sh.cells)) {
      const key = `${sh.name}!${addr}`;
      if (!out.has(key)) evalCell(cell.raw, wb, sh, out, key);
    }
  }
  return out;
}

export function displayValue(v: CellValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') { if (!isFinite(v)) return '#NUM!'; return String(Math.round(v * 1e10) / 1e10); }
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  return String(v);
}

export function newSheet(name: string, rows = 40, cols = 12): SheetData {
  return { name, cells: {}, rows, cols };
}
export function newWorkbook(): Workbook { return { sheets: [newSheet('Sheet1')] }; }