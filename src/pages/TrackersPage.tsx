import { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Plus, Trash2, Pencil, Save, Download, Share2, Users, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Workbook as WorkbookView } from '@/components/spreadsheet/Workbook';
import { newWorkbook, rcToAddr, type Workbook as WB } from '@/lib/spreadsheet/engine';

interface Tracker {
  id: string;
  ownerId: string;
  name: string;
  icon: string;
  color: string;
  workbook: WB;
  myRole: 'owner' | 'editor' | 'viewer';
}

// Legacy → workbook migration for old tracker rows.
function legacyToWorkbook(columns: any[], rows: any[]): WB {
  const wb = newWorkbook();
  const sh = wb.sheets[0];
  const cols = Array.isArray(columns) ? columns : [];
  const rws = Array.isArray(rows) ? rows : [];
  cols.forEach((c, ci) => { sh.cells[rcToAddr(0, ci)] = { raw: String(c?.label ?? '') }; });
  rws.forEach((r, ri) => cols.forEach((c, ci) => {
    const v = r?.[c?.key];
    if (v !== undefined && v !== null && v !== '') sh.cells[rcToAddr(ri + 1, ci)] = { raw: String(v) };
  }));
  sh.rows = Math.max(40, rws.length + 5);
  sh.cols = Math.max(12, cols.length + 2);
  return wb;
}

function toWorkbook(raw: any): WB {
  if (raw && typeof raw === 'object' && Array.isArray(raw.sheets) && raw.sheets[0]?.cells) return raw as WB;
  return newWorkbook();
}

const COLOR_CLASSES: Record<string, string> = {
  blue: 'from-blue-500/20 to-cyan-500/10 border-blue-500/40',
  green: 'from-green-500/20 to-emerald-500/10 border-green-500/40',
  red: 'from-red-500/20 to-orange-500/10 border-red-500/40',
  yellow: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/40',
  purple: 'from-primary/20 to-accent/10 border-primary/40',
};

const TrackersPage = () => {
  const { user } = useAuth();
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [shareQuery, setShareQuery] = useState('');
  const [shareRole, setShareRole] = useState<'viewer' | 'editor'>('editor');
  const [dirty, setDirty] = useState(false);
  const saveTimer = useRef<number | null>(null);

  const active = trackers.find(t => t.id === activeId);

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from('tracker_sheets')
      .select('id,user_id,name,icon,color,columns,rows')
      .order('position');
    const { data: shares } = await (supabase as any).from('tracker_sheet_collaborators').select('tracker_id,role').eq('collaborator_id', user.id);
    const shareMap = new Map((shares || []).map((s: any) => [s.tracker_id, s.role]));
    const out: Tracker[] = (data || []).map((s: any) => {
      // rows may hold a workbook OR legacy rows array.
      const wb = Array.isArray(s.rows)
        ? legacyToWorkbook(s.columns, s.rows)
        : toWorkbook(s.rows);
      return { id: s.id, ownerId: s.user_id, name: s.name, icon: s.icon || '📊', color: s.color || 'purple', workbook: wb, myRole: s.user_id === user.id ? 'owner' : (shareMap.get(s.id) as any) || 'viewer' };
    });
    setTrackers(out);
    if (out.length > 0 && !activeId) setActiveId(out[0].id);
  };

  const persist = useCallback(async (t: Tracker) => {
    if (!user) return;
    if (t.myRole === 'viewer') { toast({ title: 'Viewer access only', variant: 'destructive' }); return; }
    await supabase.from('tracker_sheets').update({
      name: t.name, icon: t.icon, color: t.color,
      // store workbook as JSON; columns kept empty (legacy field)
      columns: [] as any,
      rows: t.workbook as any,
    }).eq('id', t.id);
    setDirty(false);
  }, [user]);

  // Debounced autosave
  useEffect(() => {
    if (!dirty || !active) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => persist(active), 1500);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [dirty, active, persist]);

  const createTracker = async () => {
    if (!user) return;
    const wb = newWorkbook();
    const { data, error } = await supabase.from('tracker_sheets').insert({
      user_id: user.id, name: `Tracker ${trackers.length + 1}`, icon: '📊', color: 'purple',
      columns: [] as any, rows: wb as any, position: trackers.length,
    }).select('id').single();
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    const t: Tracker = { id: data.id, ownerId: user.id, name: `Tracker ${trackers.length + 1}`, icon: '📊', color: 'purple', workbook: wb, myRole: 'owner' };
    setTrackers(s => [...s, t]);
    setActiveId(data.id);
  };

  const deleteTracker = async (id: string) => {
    if (!user || !confirm('Delete this tracker?')) return;
    await supabase.from('tracker_sheets').delete().eq('id', id).eq('user_id', user.id);
    const rest = trackers.filter(x => x.id !== id);
    setTrackers(rest);
    if (activeId === id) setActiveId(rest[0]?.id ?? null);
  };

  const renameTracker = async (id: string) => {
    const name = renameValue.trim();
    setRenaming(null);
    if (!name) return;
    setTrackers(prev => prev.map(t => t.id === id ? { ...t, name } : t));
    await supabase.from('tracker_sheets').update({ name }).eq('id', id);
  };

  const updateActiveWorkbook = (wb: WB) => {
    setTrackers(prev => prev.map(t => t.id === activeId ? { ...t, workbook: wb } : t));
    setDirty(true);
  };

  const setActiveColor = (c: string) => {
    setTrackers(prev => prev.map(t => t.id === activeId ? { ...t, color: c } : t));
    setDirty(true);
  };

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('tracker-sheets-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_sheets' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tracker_sheet_collaborators' }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const exportActive = () => {
    if (!active) return;
    const blob = new Blob([JSON.stringify(active.workbook, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${active.name.replace(/[^a-z0-9-]+/gi, '-')}.biro-sheet.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const shareActive = async () => {
    if (!active || !user || active.myRole !== 'owner' || !shareQuery.trim()) return;
    const { data, error } = await supabase.functions.invoke('social-search', { body: { query: shareQuery.trim() } });
    if (error) { toast({ title: 'User search failed', description: error.message, variant: 'destructive' }); return; }
    const target = data?.results?.[0];
    if (!target?.user_id) { toast({ title: 'No matching user found', variant: 'destructive' }); return; }
    const { error: shareError } = await (supabase as any).from('tracker_sheet_collaborators').upsert({
      tracker_id: active.id,
      owner_id: user.id,
      collaborator_id: target.user_id,
      role: shareRole,
    }, { onConflict: 'tracker_id,collaborator_id' });
    if (shareError) toast({ title: 'Share failed', description: shareError.message, variant: 'destructive' });
    else { toast({ title: `Shared with ${target.name || target.unique_id}` }); setShareQuery(''); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-3 py-4 max-w-6xl mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">📊 Trackers</h1>
          <Button size="sm" onClick={createTracker}><Plus className="w-4 h-4 mr-1" /> New</Button>
        </div>

        {/* Tracker tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {trackers.map(t => (
            <button key={t.id}
              onClick={() => setActiveId(t.id)}
              onDoubleClick={() => { setRenaming(t.id); setRenameValue(t.name); }}
              className={cn(
                'whitespace-nowrap px-3 py-1.5 rounded-full text-xs border bg-gradient-to-r transition',
                COLOR_CLASSES[t.color] || COLOR_CLASSES.purple,
                activeId === t.id ? 'ring-2 ring-primary' : 'opacity-70'
              )}>
              {t.icon} {t.name}
              {t.myRole !== 'owner' && <span className="ml-1 opacity-70">({t.myRole})</span>}
            </button>
          ))}
          {trackers.length === 0 && <p className="text-xs text-muted-foreground py-2">No trackers yet — tap New to create one.</p>}
        </div>

        {renaming && (
          <div className="flex gap-2">
            <Input value={renameValue} onChange={e => setRenameValue(e.target.value)} autoFocus
              onKeyDown={e => { if (e.key === 'Enter') renameTracker(renaming); if (e.key === 'Escape') setRenaming(null); }}
              className="bg-secondary/50" />
            <Button onClick={() => renameTracker(renaming)} size="sm">Save</Button>
            <Button onClick={() => setRenaming(null)} variant="ghost" size="sm">Cancel</Button>
          </div>
        )}

        {active && (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1">
                <Input value={active.icon} maxLength={2}
                  onChange={e => setTrackers(prev => prev.map(t => t.id === activeId ? { ...t, icon: e.target.value || '📊' } : t))}
                  onBlur={() => setDirty(true)}
                  className="w-10 h-7 text-center bg-secondary/50 text-xs" />
                {Object.keys(COLOR_CLASSES).map(c => (
                  <button key={c} onClick={() => setActiveColor(c)}
                    className={cn('w-5 h-5 rounded-full border-2',
                      c === 'blue' && 'bg-blue-500',
                      c === 'green' && 'bg-green-500',
                      c === 'red' && 'bg-red-500',
                      c === 'yellow' && 'bg-yellow-500',
                      c === 'purple' && 'bg-primary',
                      active.color === c ? 'border-foreground scale-110' : 'border-transparent opacity-60')} />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setRenaming(active.id); setRenameValue(active.name); }}><Pencil className="w-3 h-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => persist(active)} disabled={!dirty}>
                  <Save className="w-3 h-3 mr-1" /> {dirty ? 'Save' : 'Saved'}
                </Button>
                <Button size="sm" variant="ghost" onClick={exportActive}><Download className="w-3 h-3 mr-1" /> Export</Button>
                <Button size="sm" variant="ghost" onClick={() => deleteTracker(active.id)} className="text-destructive"><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap rounded-xl border border-white/10 bg-secondary/30 p-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Wifi className="w-3 h-3" /> Realtime on</span>
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {active.myRole}</span>
              {active.myRole === 'owner' && (
                <>
                  <Input value={shareQuery} onChange={(e) => setShareQuery(e.target.value)} placeholder="Share by user ID, name, email…" className="h-8 text-xs flex-1 min-w-[12rem] bg-background/50" />
                  <select value={shareRole} onChange={(e) => setShareRole(e.target.value as any)} className="h-8 rounded-md bg-background/50 border border-white/10 text-xs px-2">
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <Button size="sm" onClick={shareActive}><Share2 className="w-3 h-3 mr-1" /> Share</Button>
                </>
              )}
            </div>

            <WorkbookView workbook={active.workbook} onChange={updateActiveWorkbook} />
          </>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default TrackersPage;