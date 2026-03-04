import { useEffect, useMemo, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGameStore } from '@/store/gameStore';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const MindGamesPage = () => {
  const { user } = useAuth();
  const { addXP, addCoins } = useGameStore();

  const [a, setA] = useState(randomBetween(5, 25));
  const [b, setB] = useState(randomBetween(3, 20));
  const [answer, setAnswer] = useState('');

  const [recallNumber, setRecallNumber] = useState('');
  const [showRecall, setShowRecall] = useState(false);
  const [recallInput, setRecallInput] = useState('');

  const [dailyScores, setDailyScores] = useState<{ game_type: string; score: number; created_at: string }[]>([]);

  const mathResult = useMemo(() => a + b, [a, b]);

  const logScore = async (gameType: string, score: number, xp: number, coins: number) => {
    if (!user) return;
    await supabase.from('mind_game_scores').insert({
      user_id: user.id,
      game_type: gameType,
      score,
      xp_earned: xp,
      coins_earned: coins,
    });
  };

  const loadScores = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('mind_game_scores')
      .select('game_type,score,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);
    setDailyScores(data || []);
  };

  useEffect(() => {
    void loadScores();
  }, [user]);

  const submitMath = async () => {
    const isCorrect = Number(answer) === mathResult;
    if (!isCorrect) {
      toast({ title: 'Wrong answer', description: 'Try again 💪', variant: 'destructive' });
      return;
    }

    addXP(10);
    addCoins(3);
    await logScore('quick_math', 1, 10, 3);
    toast({ title: 'Correct! +10 XP +3 Coins' });
    setA(randomBetween(5, 25));
    setB(randomBetween(3, 20));
    setAnswer('');
    void loadScores();
  };

  const startRecall = () => {
    const value = `${randomBetween(1000, 9999)}`;
    setRecallNumber(value);
    setShowRecall(true);
    setRecallInput('');
    setTimeout(() => setShowRecall(false), 3000);
  };

  const submitRecall = async () => {
    if (recallInput === recallNumber) {
      addXP(12);
      addCoins(4);
      await logScore('number_recall', 1, 12, 4);
      toast({ title: 'Great memory! +12 XP +4 Coins' });
      void loadScores();
    } else {
      toast({ title: 'Not matched', description: `Correct was ${recallNumber}`, variant: 'destructive' });
    }
    setRecallInput('');
    setRecallNumber('');
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">🧠 Mind Games</h1>
          <div className="w-16" />
        </div>

        <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle>Quick Math</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">Solve: <span className="font-game">{a} + {b} = ?</span></p>
            <div className="flex gap-2">
              <Input value={answer} onChange={(e) => setAnswer(e.target.value)} type="number" placeholder="Answer" />
              <Button onClick={submitMath}>Check</Button>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle>Number Recall</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={startRecall} variant="outline">Show number for 3s</Button>
            {showRecall && <p className="text-2xl font-game tracking-widest text-center">{recallNumber}</p>}
            {!showRecall && recallNumber && (
              <div className="flex gap-2">
                <Input value={recallInput} onChange={(e) => setRecallInput(e.target.value)} placeholder="Type the number" />
                <Button onClick={submitRecall}>Submit</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle>Recent Scores</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {dailyScores.length === 0 && <p className="text-sm text-muted-foreground">No scores yet.</p>}
            {dailyScores.map((row, idx) => (
              <div key={`${row.created_at}-${idx}`} className="text-sm border border-border rounded-md px-3 py-2">
                {row.game_type} • Score {row.score}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
      <BottomNav />
    </div>
  );
};

export default MindGamesPage;
