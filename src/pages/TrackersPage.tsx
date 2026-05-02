import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, BarChart3, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Sheet {
  id: string;
  name: string;
  icon: string;
  color: string;
  columns: { key: string; label: string; type: 'text' | 'number' }[];
  rows: Record<string, string | number>[];
}

const COLOR_CLASSES: Record<string, string> = {
  blue: 'border-blue-500/40 from-blue-500/10 to-cyan-500/10',
  green: 'border-green-500/40 from-green-500/10 to-emerald-500/10',
  red: 'border-red-500/40 from-red-500/10 to-orange-500/10',
  yellow: 'border-yellow-500/40 from-yellow-500/10 to-amber-500/10',
  purple: 'border-primary/40 from-primary/10 to-accent/10',
};

const DEFAULT_TEMPLATE = (name: string): Omit<Sheet, 'id'> => ({
  name, icon: '📊', color: 'purple',
  columns: [
    { key: 'date', label: 'Date', type: 'text' },
    { key: 'topic', label: 'Topic', type: 'text' },
    { key: 'hours', label: 'Hours', type: 'number' },
    { key: 'rating', label: 'Self-rating /10', type: 'number' },
  ],
  rows: [],
});

const TrackersPage = () => {
  const { user } = useAuth();
  const [sheets, setSheets] = useState<Sheet[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [dirty, setDirty] = useState(false);

  const active = sheets.find(s => s.id === activeId);

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('tracker_sheets')
      .select('id,name,icon,color,columns,rows')
      .eq('user_id', user.id).order('position');
    const out: Sheet[] = (data || []).map((s: any) => ({
      id: s.id, name: s.name, icon: s.icon || '📊', color: s.color || 'purple',
      columns: Array.isArray(s.columns) ? s.columns : [],
      rows: Array.isArray(s.rows) ? s.rows : [],
    }));
    setSheets(out);
    if (out.length > 0 && !activeId) setActiveId(out[0].id);
  };

  const persist = async (sheet: Sheet) => {
    if (!user) return;
    await supabase.from('tracker_sheets').update({
      name: sheet.name, icon: sheet.icon, color: sheet.color,
      columns: sheet.columns as any, rows: sheet.rows as any,
    }).eq('id', sheet.id).eq('user_id', user.id);
    setDirty(false);
    toast({ title: 'Saved 💾' });
  };

  const createSheet = async () => {
    if (!user) return;
    const tpl = DEFAULT_TEMPLATE(`Tracker ${sheets.length + 1}`);
    const { data, error } = await supabase.from('tracker_sheets').insert({
      user_id: user.id, name: tpl.name, icon: tpl.icon, color: tpl.color,
      columns: tpl.columns as any, rows: tpl.rows as any, position: sheets.length,
    }).select('id').single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    const newSheet: Sheet = { id: data.id, ...tpl };
    setSheets(s => [...s, newSheet]);
    setActiveId(data.id);
  };

  const deleteSheet = async (id: string) => {
    if (!user || !confirm('Delete this tracker?')) return;
    await supabase.from('tracker_sheets').delete().eq('id', id).eq('user_id', user.id);
    setSheets(s => s.filter(x => x.id !== id));
    if (activeId === id) setActiveId(null);
  };

  const updateActive = (mut: (s: Sheet) => Sheet) => {
    setSheets(prev => prev.map(s => s.id === activeId ? mut(s) : s));
    setDirty(true);
  };

  const renameSheet = async (id: string) => {
    if (!renameValue.trim()) { setRenaming(null); return; }
    setSheets(prev => prev.map(s => s.id === id ? { ...s, name: renameValue.trim() } : s));
    await supabase.from('tracker_sheets').update({ name: renameValue.trim() }).eq('id', id).eq('user_id', user!.id);
    setRenaming(null);
  };

  // Auto-analysis
  const analysis = useMemo(() => {
    if (!active) return null;
    const numericCols = active.columns.filter(c => c.type === 'number');
    if (numericCols.length === 0 || active.rows.length === 0) return null;
    return numericCols.map(c => {
      const vals = active.rows.map(r => Number(r[c.key]) || 0);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = sum / vals.length;
      const max = Math.max(...vals);
      const min = Math.min(...vals);
      return { col: c.label, sum, avg: Math.round(avg * 100) / 100, max, min };
    });
  }, [active]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">📊 My Trackers</h1>
          <Button size="sm" onClick={createSheet}><Plus className="w-4 h-4 mr-1" /> New</Button>
        </div>

        {/* Sheet tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sheets.map(s => (
            <button key={s.id} onClick={() => { setActiveId(s.id); setDirty(false); }}
              onDoubleClick={() => { setRenaming(s.id); setRenameValue(s.name); }}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-full text-xs border bg-gradient-to-r',
                COLOR_CLASSES[s.color] || COLOR_CLASSES.purple,
                activeId === s.id ? 'glow-purple' : 'opacity-70'
              )}>
              {s.icon} {s.name}
            </button>
          ))}
          {sheets.length === 0 && <p className="text-xs text-muted-foreground py-2">No trackers yet — tap New to create one.</p>}
        </div>

        {renaming && (
          <div className="flex gap-2">
            <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} placeholder="Sheet name" autoFocus
              onKeyDown={e => { if (e.key === 'Enter') renameSheet(renaming); }} className="bg-secondary/50" />
            <Button onClick={() => renameSheet(renaming)} size="sm">Save</Button>
            <Button onClick={() => setRenaming(null)} variant="ghost" size="sm">Cancel</Button>
          </div>
        )}

        {active && (
          <Card className={cn('glass-panel border bg-gradient-to-br', COLOR_CLASSES[active.color] || COLOR_CLASSES.purple)}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-game flex items-center gap-2">
                  {active.icon} {active.name}
                </CardTitle>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setRenaming(active.id); setRenameValue(active.name); }}><Pencil className="w-3 h-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteSheet(active.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
                </div>
              </div>
              {/* Color picker */}
              <div className="flex gap-1 pt-1">
                {Object.keys(COLOR_CLASSES).map(c => (
                  <button key={c} onClick={() => updateActive(s => ({ ...s, color: c }))}
                    className={cn('w-5 h-5 rounded-full border-2',
                      c === 'blue' && 'bg-blue-500',
                      c === 'green' && 'bg-green-500',
                      c === 'red' && 'bg-red-500',
                      c === 'yellow' && 'bg-yellow-500',
                      c === 'purple' && 'bg-primary',
                      active.color === c ? 'border-foreground scale-110' : 'border-transparent opacity-60')} />
                ))}
                <Input value={active.icon} maxLength={2}
                  onChange={e => updateActive(s => ({ ...s, icon: e.target.value || '📊' }))}
                  className="w-12 h-6 ml-2 text-center bg-secondary/50 text-xs" />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Editable table */}
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/40">
                    <tr>
                      {active.columns.map((col, i) => (
                        <th key={col.key} className="px-2 py-1 text-left">
                          <input value={col.label}
                            onChange={e => updateActive(s => ({ ...s, columns: s.columns.map((c, idx) => idx === i ? { ...c, label: e.target.value } : c) }))}
                            className="bg-transparent w-full border-b border-transparent focus:border-primary outline-none font-game" />
                        </th>
                      ))}
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {active.rows.map((row, ri) => (
                      <tr key={ri} className="border-t border-border/30">
                        {active.columns.map(col => (
                          <td key={col.key} className="px-1 py-0.5">
                            <input value={String(row[col.key] ?? '')} type={col.type === 'number' ? 'number' : 'text'}
                              onChange={e => updateActive(s => ({
                                ...s,
                                rows: s.rows.map((r, idx) => idx === ri ? { ...r, [col.key]: col.type === 'number' ? Number(e.target.value) : e.target.value } : r),
                              }))}
                              className="w-full bg-transparent px-1 py-0.5 outline-none focus:bg-primary/10 rounded" />
                          </td>
                        ))}
                        <td className="text-center">
                          <button onClick={() => updateActive(s => ({ ...s, rows: s.rows.filter((_, idx) => idx !== ri) }))}
                            className="text-destructive"><Trash2 className="w-3 h-3" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => updateActive(s => ({
                  ...s, rows: [...s.rows, Object.fromEntries(s.columns.map(c => [c.key, c.type === 'number' ? 0 : '']))],
                }))}><Plus className="w-3 h-3 mr-1" /> Row</Button>
                <Button size="sm" variant="outline" onClick={() => {
                  const label = prompt('Column label?'); if (!label) return;
                  const type = (prompt('Type? text/number', 'text') === 'number') ? 'number' : 'text';
                  const key = `c${Date.now()}`;
                  updateActive(s => ({ ...s, columns: [...s.columns, { key, label, type }] }));
                }}><Plus className="w-3 h-3 mr-1" /> Column</Button>
                <Button size="sm" onClick={() => persist(active)} disabled={!dirty} className={cn(dirty && 'bg-primary glow-purple animate-pulse')}>
                  <Save className="w-3 h-3 mr-1" /> {dirty ? 'Save' : 'Saved'}
                </Button>
              </div>

              {/* Analysis */}
              {analysis && (
                <div className="border border-border/50 rounded-lg p-3 space-y-2 bg-background/40">
                  <p className="text-xs font-game flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> Auto Analysis</p>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {analysis.map(a => (
                      <div key={a.col} className="border border-border/30 rounded px-2 py-1">
                        <p className="font-game text-primary">{a.col}</p>
                        <p>Σ {a.sum} • avg {a.avg}</p>
                        <p className="text-muted-foreground">min {a.min} / max {a.max}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default TrackersPage;