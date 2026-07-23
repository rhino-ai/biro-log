import { useEffect, useState } from 'react';
import { BackButton } from '@/components/layout/BackButton';
import { useGame } from '@/hooks/useGame';
import { RotateCw, Flame, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

// Ebbinghaus-ish intervals (days): 1, 3, 7, 14, 30
const INTERVALS = [1, 3, 7, 14, 30];

interface ChapterRow {
  jungle_id: string;
  chapter_id: string;
  theory_done: boolean;
  practice_done: boolean;
  revision_done: boolean;
  updated_at: string;
}

const urgency = (daysSince: number, nextDue: number) => {
  const overdue = daysSince - nextDue;
  if (overdue >= 3) return { c: 'red', label: 'OVERDUE', icon: AlertTriangle };
  if (overdue >= 0) return { c: 'yellow', label: 'DUE NOW', icon: Flame };
  return { c: 'green', label: 'ON TRACK', icon: CheckCircle2 };
};

const RevisionSchedulerPage = () => {
  const { user } = useAuth();
  const { jungles } = useGame();
  const [rows, setRows] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from('user_chapter_progress')
      .select('jungle_id,chapter_id,theory_done,practice_done,revision_done,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });
    setRows((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const items = rows
    .filter((r) => r.theory_done || r.practice_done)
    .map((r) => {
      const updated = new Date(r.updated_at).getTime();
      const daysSince = Math.floor((Date.now() - updated) / 86400000);
      // pick next due based on how many intervals already passed
      const nextIdx = INTERVALS.findIndex((iv) => iv > daysSince);
      const nextDue = nextIdx === -1 ? INTERVALS[INTERVALS.length - 1] : INTERVALS[Math.max(0, nextIdx - 1)];
      const u = urgency(daysSince, nextDue);
      const jungle = jungles.find((j) => j.id === r.jungle_id);
      const chapter = jungle?.chapters?.find((c: any) => c.id === r.chapter_id);
      return { ...r, daysSince, nextDue, u, jungleName: jungle?.name || r.jungle_id, chapterName: chapter?.name || r.chapter_id, icon: jungle?.icon || '📚' };
    })
    .sort((a, b) => (b.daysSince - b.nextDue) - (a.daysSince - a.nextDue));

  const counts = { red: 0, yellow: 0, green: 0 };
  items.forEach((i) => counts[i.u.c as keyof typeof counts]++);

  const markRevised = async (r: ChapterRow) => {
    if (!user) return;
    await supabase.from('user_chapter_progress')
      .update({ revision_done: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('jungle_id', r.jungle_id).eq('chapter_id', r.chapter_id);
    toast({ title: '✅ Revised', description: 'Next interval scheduled.' });
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6 max-w-lg mx-auto space-y-5">
        <BackButton to="/" />
        <div className="text-center">
          <RotateCw className="w-12 h-12 text-primary mx-auto mb-2" />
          <h1 className="font-game text-2xl">Revision Scheduler</h1>
          <p className="text-xs text-muted-foreground mt-1">Spaced repetition · 1 / 3 / 7 / 14 / 30 days</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="glass-panel rounded-xl p-3 text-center border border-red-500/40">
            <p className="text-2xl font-game text-red-400">{counts.red}</p><p className="text-[10px] text-muted-foreground">OVERDUE</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center border border-yellow-500/40">
            <p className="text-2xl font-game text-yellow-400">{counts.yellow}</p><p className="text-[10px] text-muted-foreground">DUE</p>
          </div>
          <div className="glass-panel rounded-xl p-3 text-center border border-green-500/40">
            <p className="text-2xl font-game text-green-400">{counts.green}</p><p className="text-[10px] text-muted-foreground">SAFE</p>
          </div>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground text-sm py-8">Loading…</p>
        ) : items.length === 0 ? (
          <div className="glass-panel rounded-xl p-6 text-center text-sm text-muted-foreground">
            Mark some chapters as theory/practice done to populate the scheduler.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((i) => {
              const Icon = i.u.icon;
              const colorMap: any = {
                red: 'border-red-500/50 bg-red-500/5 text-red-400',
                yellow: 'border-yellow-500/50 bg-yellow-500/5 text-yellow-400',
                green: 'border-green-500/50 bg-green-500/5 text-green-400',
              };
              return (
                <div key={`${i.jungle_id}-${i.chapter_id}`} className={`glass-panel rounded-xl p-3 border flex items-center gap-3 ${colorMap[i.u.c]}`}>
                  <span className="text-xl">{i.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{i.chapterName}</p>
                    <p className="text-[10px] text-muted-foreground">{i.jungleName} · last touched {i.daysSince}d ago · next at {i.nextDue}d</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] flex items-center gap-1"><Icon className="w-3 h-3" />{i.u.label}</span>
                    <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px]" onClick={() => markRevised(i)}>Done</Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default RevisionSchedulerPage;