import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { colToLetter, computeWorkbook, displayValue, letterToCol, rcToAddr, addrToRC, type Cell, type CellStyle, type SheetData, type Workbook } from '@/lib/spreadsheet/engine';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Rows3, Columns3, Trash, Snowflake, Search, PaintBucket, Type } from 'lucide-react';

type Sel = { r: number; c: number };
type Range = { r1: number; c1: number; r2: number; c2: number };

export function SheetGrid({
  workbook,
  activeIndex,
  onChange,
  zoom = 1,
  onZoom,
}: {
  workbook: Workbook;
  activeIndex: number;
  onChange: (wb: Workbook) => void;
  zoom?: number;
  onZoom?: (z: number) => void;
}) {
  const sheet = workbook.sheets[activeIndex];
  const [sel, setSel] = useState<Sel>({ r: 0, c: 0 });
  const [range, setRange] = useState<Range | null>(null);
  const [editing, setEditing] = useState<null | { r: number; c: number; text: string }>(null);
  const [history, setHistory] = useState<Workbook[]>([]);
  const [future, setFuture] = useState<Workbook[]>([]);
  const [findOpen, setFindOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const values = useMemo(() => computeWorkbook(workbook), [workbook]);

  const pushHistory = useCallback((prev: Workbook) => {
    setHistory(h => [...h.slice(-49), prev]);
    setFuture([]);
  }, []);

  const applyChange = useCallback((mutator: (wb: Workbook) => Workbook) => {
    pushHistory(structuredClone(workbook));
    onChange(mutator(structuredClone(workbook)));
  }, [workbook, onChange, pushHistory]);

  const setCell = (r: number, c: number, raw: string) => {
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      const addr = rcToAddr(r, c);
      if (raw === '') delete sh.cells[addr]; else sh.cells[addr] = { raw };
      // Auto-expand
      if (r + 1 >= sh.rows) sh.rows = r + 5;
      if (c + 1 >= sh.cols) sh.cols = c + 3;
      return wb;
    });
  };

  const startEdit = (r: number, c: number, initial?: string) => {
    const addr = rcToAddr(r, c);
    const raw = sheet.cells[addr]?.raw ?? '';
    setEditing({ r, c, text: initial !== undefined ? initial : raw });
    setSel({ r, c });
  };
  const commitEdit = (moveDir?: 'down' | 'right' | null) => {
    if (!editing) return;
    setCell(editing.r, editing.c, editing.text);
    setEditing(null);
    if (moveDir === 'down') setSel(s => ({ ...s, r: s.r + 1 }));
    else if (moveDir === 'right') setSel(s => ({ ...s, c: s.c + 1 }));
    setTimeout(() => gridRef.current?.focus(), 0);
  };
  const cancelEdit = () => { setEditing(null); setTimeout(() => gridRef.current?.focus(), 0); };

  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);
  useEffect(() => { setSel({ r: 0, c: 0 }); setEditing(null); setRange(null); }, [activeIndex]);

  const normRange = (rg: Range): Range => ({
    r1: Math.min(rg.r1, rg.r2), c1: Math.min(rg.c1, rg.c2),
    r2: Math.max(rg.r1, rg.r2), c2: Math.max(rg.c1, rg.c2),
  });

  const currentRange = (): Range => range || { r1: sel.r, c1: sel.c, r2: sel.r, c2: sel.c };

  const applyStyleToSelection = (patch: Partial<CellStyle>) => {
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      const rg = currentRange();
      for (let r = rg.r1; r <= rg.r2; r++)
        for (let c = rg.c1; c <= rg.c2; c++) {
          const addr = rcToAddr(r, c);
          const cell = sh.cells[addr] || { raw: '' };
          cell.style = { ...(cell.style || {}), ...patch };
          // Clean empty
          if (cell.style) {
            (Object.keys(cell.style) as (keyof CellStyle)[]).forEach(k => {
              const v = (cell.style as any)[k];
              if (v === undefined || v === '' || v === false) delete (cell.style as any)[k];
            });
            if (Object.keys(cell.style).length === 0) delete cell.style;
          }
          sh.cells[addr] = cell;
        }
      return wb;
    });
  };

  const toggleStyleBool = (key: 'bold' | 'italic' | 'underline') => {
    const addr = rcToAddr(sel.r, sel.c);
    const cur = !!sheet.cells[addr]?.style?.[key];
    applyStyleToSelection({ [key]: !cur } as any);
  };

  const insertRow = (offset: 0 | 1) => {
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      const at = sel.r + offset;
      const next: Record<string, Cell> = {};
      Object.entries(sh.cells).forEach(([addr, cell]) => {
        const rc = addrToRC(addr); if (!rc) return;
        const nr = rc.r >= at ? rc.r + 1 : rc.r;
        next[rcToAddr(nr, rc.c)] = cell as any;
      });
      sh.cells = next; sh.rows = Math.max(sh.rows + 1, at + 5);
      return wb;
    });
  };
  const insertCol = (offset: 0 | 1) => {
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      const at = sel.c + offset;
      const next: Record<string, Cell> = {};
      Object.entries(sh.cells).forEach(([addr, cell]) => {
        const rc = addrToRC(addr); if (!rc) return;
        const nc = rc.c >= at ? rc.c + 1 : rc.c;
        next[rcToAddr(rc.r, nc)] = cell as any;
      });
      sh.cells = next; sh.cols = Math.max(sh.cols + 1, at + 3);
      return wb;
    });
  };
  const deleteRow = () => {
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      const at = sel.r;
      const next: Record<string, Cell> = {};
      Object.entries(sh.cells).forEach(([addr, cell]) => {
        const rc = addrToRC(addr); if (!rc) return;
        if (rc.r === at) return;
        const nr = rc.r > at ? rc.r - 1 : rc.r;
        next[rcToAddr(nr, rc.c)] = cell as any;
      });
      sh.cells = next; sh.rows = Math.max(1, sh.rows - 1);
      return wb;
    });
  };
  const deleteCol = () => {
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      const at = sel.c;
      const next: Record<string, Cell> = {};
      Object.entries(sh.cells).forEach(([addr, cell]) => {
        const rc = addrToRC(addr); if (!rc) return;
        if (rc.c === at) return;
        const nc = rc.c > at ? rc.c - 1 : rc.c;
        next[rcToAddr(rc.r, nc)] = cell as any;
      });
      sh.cells = next; sh.cols = Math.max(1, sh.cols - 1);
      return wb;
    });
  };
  const toggleFreeze = () => {
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      if (sh.freezeRow || sh.freezeCol) { delete sh.freezeRow; delete sh.freezeCol; }
      else { sh.freezeRow = 1; sh.freezeCol = 1; }
      return wb;
    });
  };
  const runFindReplace = () => {
    if (!findText) return;
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      Object.entries(sh.cells).forEach(([addr, cell]) => {
        if (cell.raw && cell.raw.includes(findText)) {
          sh.cells[addr] = { ...cell, raw: cell.raw.split(findText).join(replaceText) };
        }
      });
      return wb;
    });
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (editing) return; // input handles keys
    const meta = e.ctrlKey || e.metaKey;
    // Zoom
    if (meta && (e.key === '=' || e.key === '+')) { e.preventDefault(); onZoom?.(Math.min(2, (zoom || 1) + 0.1)); return; }
    if (meta && e.key === '-') { e.preventDefault(); onZoom?.(Math.max(0.6, (zoom || 1) - 0.1)); return; }
    if (meta && e.key === '0') { e.preventDefault(); onZoom?.(1); return; }
    // Formatting shortcuts
    if (meta && e.key.toLowerCase() === 'b') { e.preventDefault(); toggleStyleBool('bold'); return; }
    if (meta && e.key.toLowerCase() === 'i') { e.preventDefault(); toggleStyleBool('italic'); return; }
    if (meta && e.key.toLowerCase() === 'u') { e.preventDefault(); toggleStyleBool('underline'); return; }
    if (meta && e.key.toLowerCase() === 'f') { e.preventDefault(); setFindOpen(v => !v); return; }
    // Undo / redo
    if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault();
      if (history.length === 0) return;
      const prev = history[history.length - 1];
      setHistory(h => h.slice(0, -1));
      setFuture(f => [...f, structuredClone(workbook)]);
      onChange(prev); return;
    }
    if (meta && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
      e.preventDefault();
      if (future.length === 0) return;
      const nxt = future[future.length - 1];
      setFuture(f => f.slice(0, -1));
      setHistory(h => [...h, structuredClone(workbook)]);
      onChange(nxt); return;
    }
    // Copy / paste / cut
    if (meta && e.key.toLowerCase() === 'c') { e.preventDefault(); copySelection(); return; }
    if (meta && e.key.toLowerCase() === 'x') { e.preventDefault(); copySelection(); clearSelection(); return; }
    if (meta && e.key.toLowerCase() === 'v') { /* handled via onPaste */ return; }

    const step = (dr: number, dc: number, extend = false) => {
      e.preventDefault();
      const r = Math.max(0, Math.min(sheet.rows - 1, sel.r + dr));
      const c = Math.max(0, Math.min(sheet.cols - 1, sel.c + dc));
      if (extend) setRange(normRange({ r1: sel.r, c1: sel.c, r2: r, c2: c }));
      else { setSel({ r, c }); setRange(null); }
    };
    switch (e.key) {
      case 'ArrowUp': return step(-1, 0, e.shiftKey);
      case 'ArrowDown': return step(1, 0, e.shiftKey);
      case 'ArrowLeft': return step(0, -1, e.shiftKey);
      case 'ArrowRight': return step(0, 1, e.shiftKey);
      case 'Tab': e.preventDefault(); setSel({ r: sel.r, c: Math.max(0, sel.c + (e.shiftKey ? -1 : 1)) }); return;
      case 'Enter': e.preventDefault(); startEdit(sel.r, sel.c); return;
      case 'F2': e.preventDefault(); startEdit(sel.r, sel.c); return;
      case 'Delete': case 'Backspace': e.preventDefault(); clearSelection(); return;
      case 'Escape': setRange(null); return;
    }
    // Alphanumeric → begin editing with that char
    if (!meta && e.key.length === 1) { e.preventDefault(); startEdit(sel.r, sel.c, e.key); }
  };

  const clearSelection = () => {
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      const rg = range || { r1: sel.r, c1: sel.c, r2: sel.r, c2: sel.c };
      for (let r = rg.r1; r <= rg.r2; r++)
        for (let c = rg.c1; c <= rg.c2; c++)
          delete sh.cells[rcToAddr(r, c)];
      return wb;
    });
  };

  const copySelection = () => {
    const rg = range || { r1: sel.r, c1: sel.c, r2: sel.r, c2: sel.c };
    const rows: string[] = [];
    for (let r = rg.r1; r <= rg.r2; r++) {
      const line: string[] = [];
      for (let c = rg.c1; c <= rg.c2; c++) {
        const raw = sheet.cells[rcToAddr(r, c)]?.raw ?? '';
        line.push(raw.replace(/\t/g, ' ').replace(/\n/g, ' '));
      }
      rows.push(line.join('\t'));
    }
    navigator.clipboard?.writeText(rows.join('\n')).catch(() => {});
  };

  const onPaste = (e: React.ClipboardEvent) => {
    if (editing) return;
    const text = e.clipboardData.getData('text/plain');
    if (!text) return;
    e.preventDefault();
    const rows = text.replace(/\r/g, '').split('\n');
    applyChange(wb => {
      const sh = wb.sheets[activeIndex];
      rows.forEach((line, rOff) => {
        line.split('\t').forEach((val, cOff) => {
          const r = sel.r + rOff, c = sel.c + cOff;
          if (r >= sh.rows) sh.rows = r + 1;
          if (c >= sh.cols) sh.cols = c + 1;
          if (val === '') delete sh.cells[rcToAddr(r, c)];
          else sh.cells[rcToAddr(r, c)] = { raw: val };
        });
      });
      return wb;
    });
  };

  const inSel = (r: number, c: number) => {
    if (range) return r >= range.r1 && r <= range.r2 && c >= range.c1 && c <= range.c2;
    return r === sel.r && c === sel.c;
  };

  // Scroll active cell into view
  useEffect(() => {
    const el = gridRef.current?.querySelector<HTMLElement>(`[data-cell="${sel.r}-${sel.c}"]`);
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [sel.r, sel.c]);

  const activeAddr = rcToAddr(sel.r, sel.c);
  const activeRaw = sheet.cells[activeAddr]?.raw ?? '';
  const activeStyle = sheet.cells[activeAddr]?.style;

  const onWheelZoom = (e: React.WheelEvent) => {
    if (!(e.ctrlKey || e.metaKey) || !onZoom) return;
    e.preventDefault();
    const dir = e.deltaY > 0 ? -1 : 1;
    onZoom(Math.min(2, Math.max(0.6, (zoom || 1) + dir * 0.1)));
  };

  // Pinch-to-zoom (two-finger) for touch devices — Google Sheets style.
  const pinchStartDist = useRef<number | null>(null);
  const pinchStartZoom = useRef<number>(1);
  const dist = (a: React.Touch, b: React.Touch) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchStartDist.current = dist(e.touches[0], e.touches[1]);
      pinchStartZoom.current = zoom || 1;
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current && onZoom) {
      e.preventDefault();
      const d = dist(e.touches[0], e.touches[1]);
      const ratio = d / pinchStartDist.current;
      const next = Math.min(2, Math.max(0.6, pinchStartZoom.current * ratio));
      onZoom(Math.round(next * 20) / 20);
    }
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartDist.current = null;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Formatting toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1 border-b border-white/10 bg-secondary/40 text-xs">
        <button title="Bold (Ctrl+B)" onClick={() => toggleStyleBool('bold')} className={cn('h-7 w-7 rounded hover:bg-secondary flex items-center justify-center', activeStyle?.bold && 'bg-primary/30')}><Bold className="w-3.5 h-3.5" /></button>
        <button title="Italic (Ctrl+I)" onClick={() => toggleStyleBool('italic')} className={cn('h-7 w-7 rounded hover:bg-secondary flex items-center justify-center', activeStyle?.italic && 'bg-primary/30')}><Italic className="w-3.5 h-3.5" /></button>
        <button title="Underline (Ctrl+U)" onClick={() => toggleStyleBool('underline')} className={cn('h-7 w-7 rounded hover:bg-secondary flex items-center justify-center', activeStyle?.underline && 'bg-primary/30')}><Underline className="w-3.5 h-3.5" /></button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button title="Align left" onClick={() => applyStyleToSelection({ align: 'left' })} className={cn('h-7 w-7 rounded hover:bg-secondary flex items-center justify-center', activeStyle?.align === 'left' && 'bg-primary/30')}><AlignLeft className="w-3.5 h-3.5" /></button>
        <button title="Align center" onClick={() => applyStyleToSelection({ align: 'center' })} className={cn('h-7 w-7 rounded hover:bg-secondary flex items-center justify-center', activeStyle?.align === 'center' && 'bg-primary/30')}><AlignCenter className="w-3.5 h-3.5" /></button>
        <button title="Align right" onClick={() => applyStyleToSelection({ align: 'right' })} className={cn('h-7 w-7 rounded hover:bg-secondary flex items-center justify-center', activeStyle?.align === 'right' && 'bg-primary/30')}><AlignRight className="w-3.5 h-3.5" /></button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <label title="Fill color" className="h-7 px-1 rounded hover:bg-secondary flex items-center gap-1 cursor-pointer">
          <PaintBucket className="w-3.5 h-3.5" />
          <input type="color" className="w-4 h-4 border-0 bg-transparent p-0 cursor-pointer" onChange={(e) => applyStyleToSelection({ bg: e.target.value })} />
        </label>
        <label title="Text color" className="h-7 px-1 rounded hover:bg-secondary flex items-center gap-1 cursor-pointer">
          <Type className="w-3.5 h-3.5" />
          <input type="color" className="w-4 h-4 border-0 bg-transparent p-0 cursor-pointer" onChange={(e) => applyStyleToSelection({ color: e.target.value })} />
        </label>
        <button title="Clear formatting" onClick={() => applyStyleToSelection({ bold: false, italic: false, underline: false, align: undefined, bg: '', color: '' } as any)} className="h-7 px-2 rounded hover:bg-secondary text-[10px]">Clear</button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button title="Insert row above" onClick={() => insertRow(0)} className="h-7 px-1.5 rounded hover:bg-secondary flex items-center gap-1"><Rows3 className="w-3.5 h-3.5" />+</button>
        <button title="Insert row below" onClick={() => insertRow(1)} className="h-7 px-1.5 rounded hover:bg-secondary text-[10px]">Row↓</button>
        <button title="Insert column left" onClick={() => insertCol(0)} className="h-7 px-1.5 rounded hover:bg-secondary flex items-center gap-1"><Columns3 className="w-3.5 h-3.5" />+</button>
        <button title="Insert column right" onClick={() => insertCol(1)} className="h-7 px-1.5 rounded hover:bg-secondary text-[10px]">Col→</button>
        <button title="Delete row" onClick={deleteRow} className="h-7 px-1.5 rounded hover:bg-destructive/30 flex items-center gap-1"><Trash className="w-3.5 h-3.5" />R</button>
        <button title="Delete column" onClick={deleteCol} className="h-7 px-1.5 rounded hover:bg-destructive/30 flex items-center gap-1"><Trash className="w-3.5 h-3.5" />C</button>
        <div className="w-px h-5 bg-white/10 mx-1" />
        <button title="Freeze first row & column" onClick={toggleFreeze} className={cn('h-7 px-1.5 rounded hover:bg-secondary flex items-center gap-1', (sheet.freezeRow || sheet.freezeCol) && 'bg-primary/30')}><Snowflake className="w-3.5 h-3.5" /></button>
        <button title="Find & replace (Ctrl+F)" onClick={() => setFindOpen(v => !v)} className={cn('h-7 px-1.5 rounded hover:bg-secondary flex items-center gap-1', findOpen && 'bg-primary/30')}><Search className="w-3.5 h-3.5" /></button>
      </div>
      {findOpen && (
        <div className="flex items-center gap-1 p-1 border-b border-white/10 bg-secondary/60 text-xs">
          <input value={findText} onChange={(e) => setFindText(e.target.value)} placeholder="Find" className="flex-1 min-w-0 bg-background/70 px-2 py-1 rounded border border-white/10" />
          <input value={replaceText} onChange={(e) => setReplaceText(e.target.value)} placeholder="Replace" className="flex-1 min-w-0 bg-background/70 px-2 py-1 rounded border border-white/10" />
          <button onClick={runFindReplace} className="px-2 py-1 rounded bg-primary text-primary-foreground">Replace all</button>
          <button onClick={() => setFindOpen(false)} className="px-2 py-1 rounded bg-secondary">Close</button>
        </div>
      )}

      {/* Formula bar */}
      <div className="flex items-center gap-2 p-1.5 border-b border-white/10 bg-secondary/30">
        <span className="text-xs font-mono text-muted-foreground px-2 py-1 bg-secondary/60 rounded min-w-[3.5rem] text-center">{activeAddr}</span>
        <input
          className="flex-1 bg-secondary/50 text-xs px-2 py-1 rounded border border-white/10 font-mono"
          value={editing ? editing.text : activeRaw}
          onFocus={() => { if (!editing) startEdit(sel.r, sel.c, activeRaw); }}
          onChange={(e) => setEditing(ed => ed ? { ...ed, text: e.target.value } : { r: sel.r, c: sel.c, text: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitEdit('down'); }
            else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
          }}
          placeholder="Type value or =formula"
        />
      </div>

      {/* Grid */}
      <div
        ref={gridRef}
        tabIndex={0}
        onKeyDown={onKey}
        onPaste={onPaste}
        onWheel={onWheelZoom}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="flex-1 overflow-auto outline-none focus:ring-1 focus:ring-primary/40"
        style={{ fontSize: `${11 * zoom}px`, touchAction: 'pan-x pan-y' }}
      >
        <table className="border-collapse" style={{ tableLayout: 'fixed' }}>
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="w-10 h-7 bg-secondary/70 border border-white/10 sticky left-0 z-30" />
              {Array.from({ length: sheet.cols }).map((_, c) => (
                <th key={c} className="h-7 bg-secondary/70 border border-white/10 text-muted-foreground font-medium"
                    style={{ minWidth: `${(sheet.colWidths?.[c] ?? 80) * zoom}px`, width: `${(sheet.colWidths?.[c] ?? 80) * zoom}px` }}>
                  {colToLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: sheet.rows }).map((_, r) => (
              <tr key={r}>
                <th className="w-10 h-7 bg-secondary/70 border border-white/10 sticky left-0 z-10 text-muted-foreground font-medium">{r + 1}</th>
                {Array.from({ length: sheet.cols }).map((_, c) => {
                  const addr = rcToAddr(r, c);
                  const cell = sheet.cells[addr];
                  const val = cell ? values.get(`${sheet.name}!${addr}`) : null;
                  const isEditing = editing && editing.r === r && editing.c === c;
                  const selected = inSel(r, c);
                  const isActive = r === sel.r && c === sel.c;
                  const st = cell?.style;
                  return (
                    <td key={c}
                        data-cell={`${r}-${c}`}
                        className={cn(
                          'h-7 border border-white/10 px-1.5 align-middle cursor-cell relative',
                          selected && 'bg-primary/20',
                          isActive && 'ring-2 ring-primary ring-inset',
                        )}
                        style={{
                          minWidth: `${(sheet.colWidths?.[c] ?? 80) * zoom}px`,
                          width: `${(sheet.colWidths?.[c] ?? 80) * zoom}px`,
                          backgroundColor: st?.bg || undefined,
                          color: st?.color || undefined,
                        }}
                        onMouseDown={(e) => {
                          if (e.shiftKey) setRange(normRange({ r1: sel.r, c1: sel.c, r2: r, c2: c }));
                          else { setSel({ r, c }); setRange(null); }
                          gridRef.current?.focus();
                        }}
                        onDoubleClick={() => startEdit(r, c)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          value={editing!.text}
                          onChange={(e) => setEditing({ r, c, text: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); commitEdit('down'); }
                            else if (e.key === 'Tab') { e.preventDefault(); commitEdit('right'); }
                            else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
                          }}
                          onBlur={() => commitEdit(null)}
                          className="w-full h-full bg-background px-0 outline-none border-0 font-mono"
                          style={{ fontSize: 'inherit' }}
                        />
                      ) : (
                        <span className={cn(
                          'block truncate',
                          st?.align ? `text-${st.align}` : (typeof val === 'number' ? 'text-right' : 'text-left'),
                          st?.bold && 'font-bold',
                          st?.italic && 'italic',
                          st?.underline && 'underline',
                          typeof val === 'string' && val.startsWith('#') && 'text-destructive',
                        )}>
                          {displayValue(val ?? null)}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}