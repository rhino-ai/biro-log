import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { colToLetter, computeWorkbook, displayValue, letterToCol, rcToAddr, addrToRC, type SheetData, type Workbook } from '@/lib/spreadsheet/engine';

type Sel = { r: number; c: number };
type Range = { r1: number; c1: number; r2: number; c2: number };

export function SheetGrid({
  workbook,
  activeIndex,
  onChange,
  zoom = 1,
}: {
  workbook: Workbook;
  activeIndex: number;
  onChange: (wb: Workbook) => void;
  zoom?: number;
}) {
  const sheet = workbook.sheets[activeIndex];
  const [sel, setSel] = useState<Sel>({ r: 0, c: 0 });
  const [range, setRange] = useState<Range | null>(null);
  const [editing, setEditing] = useState<null | { r: number; c: number; text: string }>(null);
  const [history, setHistory] = useState<Workbook[]>([]);
  const [future, setFuture] = useState<Workbook[]>([]);
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

  const onKey = (e: React.KeyboardEvent) => {
    if (editing) return; // input handles keys
    const meta = e.ctrlKey || e.metaKey;
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

  return (
    <div className="flex flex-col h-full">
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
        className="flex-1 overflow-auto outline-none focus:ring-1 focus:ring-primary/40"
        style={{ fontSize: `${11 * zoom}px` }}
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
                  return (
                    <td key={c}
                        data-cell={`${r}-${c}`}
                        className={cn(
                          'h-7 border border-white/10 px-1.5 align-middle cursor-cell relative',
                          selected && 'bg-primary/20',
                          isActive && 'ring-2 ring-primary ring-inset',
                        )}
                        style={{ minWidth: `${(sheet.colWidths?.[c] ?? 80) * zoom}px`, width: `${(sheet.colWidths?.[c] ?? 80) * zoom}px` }}
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
                          typeof val === 'number' ? 'text-right' : 'text-left',
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