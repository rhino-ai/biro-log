import { useState } from 'react';
import { SheetGrid } from './SheetGrid';
import { newSheet, type Workbook as WB } from '@/lib/spreadsheet/engine';
import { Button } from '@/components/ui/button';
import { Plus, X, Pencil, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Workbook({ workbook, onChange }: { workbook: WB; onChange: (wb: WB) => void }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [renaming, setRenaming] = useState<number | null>(null);
  const [renameVal, setRenameVal] = useState('');

  const addSheet = () => {
    const wb = structuredClone(workbook);
    let i = wb.sheets.length + 1; let name = `Sheet${i}`;
    while (wb.sheets.some(s => s.name === name)) { i++; name = `Sheet${i}`; }
    wb.sheets.push(newSheet(name));
    onChange(wb);
    setActive(wb.sheets.length - 1);
  };
  const removeSheet = (idx: number) => {
    if (workbook.sheets.length <= 1) return;
    const wb = structuredClone(workbook);
    wb.sheets.splice(idx, 1);
    onChange(wb);
    setActive(Math.max(0, Math.min(active, wb.sheets.length - 1)));
  };
  const commitRename = () => {
    if (renaming === null) return;
    const name = renameVal.trim();
    if (!name || workbook.sheets.some((s, i) => i !== renaming && s.name.toLowerCase() === name.toLowerCase())) {
      setRenaming(null); return;
    }
    const wb = structuredClone(workbook);
    wb.sheets[renaming].name = name;
    onChange(wb);
    setRenaming(null);
  };

  return (
    <div className="flex flex-col h-[70vh] rounded-xl border border-white/10 bg-background/50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-1 border-b border-white/10 bg-secondary/40">
        <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.max(0.6, z - 0.1))} className="h-7 w-7 p-0"><ZoomOut className="w-3.5 h-3.5" /></Button>
        <span className="text-xs text-muted-foreground w-10 text-center">{Math.round(zoom * 100)}%</span>
        <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="h-7 w-7 p-0"><ZoomIn className="w-3.5 h-3.5" /></Button>
        <span className="text-[10px] text-muted-foreground ml-2 hidden sm:inline">
          ↑↓←→ move · Enter edit · Tab next · Ctrl+Z undo · Ctrl+C/V copy/paste · =SUM(A1:A5)
        </span>
      </div>

      {/* Grid */}
      <SheetGrid workbook={workbook} activeIndex={active} onChange={onChange} zoom={zoom} />

      {/* Sheet tabs */}
      <div className="flex items-center gap-1 p-1 border-t border-white/10 bg-secondary/40 overflow-x-auto">
        {workbook.sheets.map((s, i) => (
          <div key={i} className={cn(
            'flex items-center gap-1 px-2 py-1 rounded text-xs cursor-pointer whitespace-nowrap group',
            i === active ? 'bg-primary text-primary-foreground' : 'bg-secondary/60 hover:bg-secondary'
          )} onClick={() => setActive(i)}>
            {renaming === i ? (
              <input autoFocus value={renameVal}
                onChange={(e) => setRenameVal(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setRenaming(null); }}
                className="bg-background text-foreground rounded px-1 py-0 w-24 text-xs" />
            ) : (
              <span onDoubleClick={() => { setRenaming(i); setRenameVal(s.name); }}>{s.name}</span>
            )}
            {i === active && (
              <>
                <Pencil className="w-3 h-3 opacity-70 hover:opacity-100" onClick={(e) => { e.stopPropagation(); setRenaming(i); setRenameVal(s.name); }} />
                {workbook.sheets.length > 1 && (
                  <X className="w-3 h-3 opacity-70 hover:opacity-100" onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${s.name}"?`)) removeSheet(i); }} />
                )}
              </>
            )}
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={addSheet} className="h-7 px-2 text-xs">
          <Plus className="w-3 h-3 mr-1" /> Sheet
        </Button>
      </div>
    </div>
  );
}