import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Calendar, Clock, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DayBucket {
  date: string;
  summary?: string;
  msgCount: number;
  firstMsg?: string;
  lastMsg?: string;
}

const MentorTimelinePage = () => {
  const { user } = useAuth();
  const [days, setDays] = useState<DayBucket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: chats }, { data: sums }] = await Promise.all([
        supabase.from('mentor_conversations').select('role,content,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('mentor_daily_summaries').select('summary_date,summary').eq('user_id', user.id).order('summary_date', { ascending: false }).limit(30),
      ]);
      const map = new Map<string, DayBucket>();
      (sums || []).forEach((s: any) => map.set(s.summary_date, { date: s.summary_date, summary: s.summary, msgCount: 0 }));
      (chats || []).forEach((c: any) => {
        const d = new Date(c.created_at).toISOString().slice(0, 10);
        const b = map.get(d) || { date: d, msgCount: 0 };
        b.msgCount += 1;
        if (!b.firstMsg) b.firstMsg = String(c.content).slice(0, 80);
        b.lastMsg = String(c.content).slice(0, 80);
        map.set(d, b);
      });
      const arr = Array.from(map.values()).sort((a, b) => b.date.localeCompare(a.date));
      setDays(arr);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-4">
        <BackButton />
        <div className="flex items-center gap-2">
          <Calendar className="w-6 h-6 text-amber-500" />
          <h1 className="font-game text-xl">Mentor Timeline</h1>
        </div>
        <p className="text-xs text-muted-foreground">Daily summary of what mentor discussed and tasks assigned.</p>

        {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
        {!loading && days.length === 0 && (
          <div className="glass-panel rounded-xl p-6 text-center text-sm text-muted-foreground">
            No mentor activity yet. <Link to="/mentor" className="text-amber-500 underline">Start chatting →</Link>
          </div>
        )}

        <div className="space-y-3">
          {days.map((d) => (
            <div key={d.date} className="glass-panel rounded-xl p-4 border border-amber-500/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-game text-sm text-amber-500">{d.date}</h3>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {d.msgCount} msgs
                </span>
              </div>
              {d.summary ? (
                <p className="text-sm whitespace-pre-wrap">{d.summary}</p>
              ) : (
                <p className="text-xs text-muted-foreground italic">{d.firstMsg || '—'}</p>
              )}
            </div>
          ))}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default MentorTimelinePage;