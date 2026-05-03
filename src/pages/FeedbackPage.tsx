import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Star, Send, Trash2, MessageSquare, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const FEATURES = [
  { key: 'mentor', label: '🎓 AI Mentor (Dronacharya)' },
  { key: 'biro_yaar', label: '🤝 Biro-yaar Buddy' },
  { key: 'mind_games', label: '🧠 Brain Gym' },
  { key: 'wellness', label: '🧘 Wellness' },
  { key: 'tasks', label: '✅ Tasks & Goals' },
  { key: 'jungles', label: '🌴 Living Jungle' },
  { key: 'analytics', label: '📊 Analytics' },
  { key: 'overall', label: '⭐ Overall App' },
];

const StarRow = ({ value, onChange, size = 'md' }: { value: number; onChange?: (v: number) => void; size?: 'sm' | 'md' }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map(n => (
      <button key={n} onClick={() => onChange?.(n)} disabled={!onChange}
        className={cn('transition-transform', onChange && 'hover:scale-110')}>
        <Star className={cn(
          size === 'md' ? 'w-5 h-5' : 'w-4 h-4',
          n <= value ? 'fill-coins text-coins' : 'text-muted-foreground'
        )} />
      </button>
    ))}
  </div>
);

const FeedbackPage = () => {
  const { user } = useAuth();
  const [ratings, setRatings] = useState<Record<string, { stars: number; comment: string }>>({});
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('feedback');
  const [comments, setComments] = useState<any[]>([]);
  const [avgs, setAvgs] = useState<Record<string, { avg: number; count: number }>>({});

  useEffect(() => { load(); }, [user]);

  const load = async () => {
    if (!user) return;
    const { data: my } = await supabase.from('feature_ratings').select('feature_key,stars,comment').eq('user_id', user.id);
    const m: Record<string, { stars: number; comment: string }> = {};
    (my || []).forEach((r: any) => { m[r.feature_key] = { stars: r.stars, comment: r.comment || '' }; });
    setRatings(m);

    const { data: all } = await supabase.from('feature_ratings').select('feature_key,stars');
    const agg: Record<string, { sum: number; n: number }> = {};
    (all || []).forEach((r: any) => {
      agg[r.feature_key] = agg[r.feature_key] || { sum: 0, n: 0 };
      agg[r.feature_key].sum += r.stars; agg[r.feature_key].n += 1;
    });
    const out: Record<string, { avg: number; count: number }> = {};
    Object.entries(agg).forEach(([k, v]) => { out[k] = { avg: v.sum / v.n, count: v.n }; });
    setAvgs(out);

    const { data: c } = await supabase.from('app_comments').select('id,user_id,category,content,created_at,resolved').order('created_at', { ascending: false }).limit(50);
    setComments(c || []);
  };

  const rate = async (key: string, stars: number) => {
    if (!user) return;
    const existing = ratings[key];
    setRatings(prev => ({ ...prev, [key]: { stars, comment: existing?.comment || '' } }));
    await supabase.from('feature_ratings').upsert({
      user_id: user.id, feature_key: key, stars, comment: existing?.comment || null,
    }, { onConflict: 'user_id,feature_key' });
    load();
  };

  const submitComment = async () => {
    if (!user || !comment.trim()) return;
    const { error } = await supabase.from('app_comments').insert({
      user_id: user.id, category, content: comment.trim(),
    });
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Thanks! Your feedback was sent 🙏' });
    setComment(''); load();
  };

  const deleteComment = async (id: string) => {
    await supabase.from('app_comments').delete().eq('id', id);
    load();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">⭐ Rate & Connect</h1>
          <div className="w-16" />
        </div>

        {/* Telegram contact + channel */}
        <Card className="glass-panel border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
          <CardHeader><CardTitle className="text-sm font-game">📞 Contact biro-team</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Doubts, queries, advertising, partnership — DM or join the channel.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <a href="https://t.me/biro1_a" target="_blank" rel="noreferrer"
                className="glass-panel rounded-xl p-3 border border-blue-500/30 flex items-center justify-between hover:border-blue-500/60 transition-colors">
                <div>
                  <p className="text-xs font-game">Direct DM</p>
                  <p className="text-[10px] text-muted-foreground">@biro1_a</p>
                </div>
                <ExternalLink className="w-4 h-4 text-blue-400" />
              </a>
              <a href="https://t.me/biroskills" target="_blank" rel="noreferrer"
                className="glass-panel rounded-xl p-3 border border-cyan-500/30 flex items-center justify-between hover:border-cyan-500/60 transition-colors">
                <div>
                  <p className="text-xs font-game">Channel</p>
                  <p className="text-[10px] text-muted-foreground">t.me/biroskills</p>
                </div>
                <ExternalLink className="w-4 h-4 text-cyan-400" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Star ratings */}
        <Card className="glass-panel border-coins/30">
          <CardHeader><CardTitle className="text-sm font-game">Rate every feature</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {FEATURES.map(f => {
              const a = avgs[f.key];
              return (
                <div key={f.key} className="flex items-center justify-between gap-2 border border-border/50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{f.label}</p>
                    {a && <p className="text-[10px] text-muted-foreground">avg {a.avg.toFixed(1)} ★ ({a.count})</p>}
                  </div>
                  <StarRow value={ratings[f.key]?.stars || 0} onChange={(v) => rate(f.key, v)} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Comment / correction */}
        <Card className="glass-panel border-primary/30">
          <CardHeader><CardTitle className="text-sm font-game flex items-center gap-2"><MessageSquare className="w-4 h-4" /> Suggest a correction or feature</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2 flex-wrap">
              {['feedback', 'bug', 'feature', 'correction'].map(c => (
                <button key={c} onClick={() => setCategory(c)}
                  className={cn('text-[11px] px-3 py-1 rounded-full border', category === c ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                  {c}
                </button>
              ))}
            </div>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} maxLength={1000}
              placeholder="Type your message..." className="bg-secondary/50" />
            <Button onClick={submitComment} disabled={!comment.trim()} className="w-full bg-primary"><Send className="w-4 h-4 mr-2" /> Send</Button>
          </CardContent>
        </Card>

        {/* Feed */}
        <Card className="glass-panel border-border">
          <CardHeader><CardTitle className="text-sm font-game">Recent comments</CardTitle></CardHeader>
          <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
            {comments.length === 0 ? <p className="text-xs text-muted-foreground">No comments yet — be first!</p> : comments.map(c => (
              <div key={c.id} className="border border-border/50 rounded-lg px-3 py-2 text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="uppercase tracking-wide">{c.category}</span>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p>{c.content}</p>
                {c.user_id === user?.id && (
                  <button onClick={() => deleteComment(c.id)} className="text-destructive text-[10px] flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default FeedbackPage;