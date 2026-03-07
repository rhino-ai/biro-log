import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useGame } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { PatternMemory } from '@/components/games/PatternMemory';
import { StroopTest } from '@/components/games/StroopTest';
import { ReactionSpeed } from '@/components/games/ReactionSpeed';
import { FocusDot } from '@/components/games/FocusDot';
import { SequenceRecall } from '@/components/games/SequenceRecall';
import { cn } from '@/lib/utils';

const randomBetween = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

type GameId = 'menu' | 'quick_math' | 'number_recall' | 'pattern_memory' | 'stroop_test' | 'reaction_speed' | 'focus_dot' | 'sequence_recall';

const games = [
  { id: 'quick_math' as GameId, name: 'Quick Math', emoji: '🧮', desc: 'Solve arithmetic fast', color: 'from-primary to-accent' },
  { id: 'number_recall' as GameId, name: 'Number Recall', emoji: '🔢', desc: 'Remember the number', color: 'from-accent to-primary' },
  { id: 'pattern_memory' as GameId, name: 'Pattern Memory', emoji: '🟦', desc: '5×5 grid memory', color: 'from-blue-500 to-cyan-500' },
  { id: 'stroop_test' as GameId, name: 'Stroop Test', emoji: '🎨', desc: 'Color vs Word', color: 'from-pink-500 to-purple-500' },
  { id: 'reaction_speed' as GameId, name: 'Reaction Speed', emoji: '⚡', desc: 'Test your reflexes', color: 'from-yellow-500 to-orange-500' },
  { id: 'focus_dot' as GameId, name: 'Focus Dot', emoji: '🎯', desc: 'Track the moving dot', color: 'from-green-500 to-teal-500' },
  { id: 'sequence_recall' as GameId, name: 'Sequence Recall', emoji: '🔤', desc: 'Remember sequences', color: 'from-indigo-500 to-violet-500' },
];

const MindGamesPage = () => {
  const { user } = useAuth();
  const { addXP, addCoins } = useGame();
  const [activeGame, setActiveGame] = useState<GameId>('menu');
  const [dailyScores, setDailyScores] = useState<{ game_type: string; score: number; created_at: string }[]>([]);

  // Quick Math state
  const [a, setA] = useState(randomBetween(5, 25));
  const [b, setB] = useState(randomBetween(3, 20));
  const [op, setOp] = useState<'+' | '-' | '×'>('+');
  const [answer, setAnswer] = useState('');

  // Number Recall state
  const [recallNumber, setRecallNumber] = useState('');
  const [showRecall, setShowRecall] = useState(false);
  const [recallInput, setRecallInput] = useState('');

  const mathResult = useMemo(() => {
    if (op === '+') return a + b;
    if (op === '-') return a - b;
    return a * b;
  }, [a, b, op]);

  const logScore = async (gameType: string, score: number, xp: number, coins: number) => {
    if (!user) return;
    addXP(xp);
    addCoins(coins);
    await supabase.from('mind_game_scores').insert({ user_id: user.id, game_type: gameType, score, xp_earned: xp, coins_earned: coins });
    loadScores();
  };

  const loadScores = async () => {
    if (!user) return;
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase.from('mind_game_scores').select('game_type,score,created_at').eq('user_id', user.id).gte('created_at', today).order('created_at', { ascending: false }).limit(20);
    setDailyScores(data || []);
  };

  useEffect(() => { loadScores(); }, [user]);

  const newMathProblem = () => {
    const ops: ('+' | '-' | '×')[] = ['+', '-', '×'];
    const newOp = ops[Math.floor(Math.random() * ops.length)];
    setOp(newOp);
    setA(newOp === '×' ? randomBetween(2, 12) : randomBetween(5, 50));
    setB(newOp === '×' ? randomBetween(2, 12) : randomBetween(3, 30));
    setAnswer('');
  };

  const submitMath = () => {
    if (Number(answer) !== mathResult) {
      toast({ title: 'Wrong! Try again 💪', variant: 'destructive' });
      return;
    }
    logScore('quick_math', 1, 10, 3);
    toast({ title: 'Correct! +10 XP +3 Coins ✅' });
    newMathProblem();
  };

  const startRecall = () => {
    const v = `${randomBetween(10000, 99999)}`;
    setRecallNumber(v); setShowRecall(true); setRecallInput('');
    setTimeout(() => setShowRecall(false), 2500);
  };

  const submitRecall = () => {
    if (recallInput === recallNumber) {
      logScore('number_recall', 1, 12, 4);
      toast({ title: 'Great memory! +12 XP +4 Coins ✅' });
    } else {
      toast({ title: 'Incorrect', description: `Was: ${recallNumber}`, variant: 'destructive' });
    }
    setRecallInput(''); setRecallNumber('');
  };

  const brainScore = dailyScores.reduce((acc, s) => acc + s.score, 0);

  // Render active game
  if (activeGame !== 'menu') {
    const gameProps = {
      onScore: (score: number) => {
        const xp = Math.max(5, Math.round(score / 2));
        const coins = Math.max(2, Math.round(score / 5));
        logScore(activeGame, score, xp, coins);
        toast({ title: `+${xp} XP +${coins} Coins 🧠` });
      },
      onBack: () => setActiveGame('menu'),
    };

    const renderGame = () => {
      switch (activeGame) {
        case 'pattern_memory': return <PatternMemory {...gameProps} />;
        case 'stroop_test': return <StroopTest {...gameProps} />;
        case 'reaction_speed': return <ReactionSpeed {...gameProps} />;
        case 'focus_dot': return <FocusDot {...gameProps} />;
        case 'sequence_recall': return <SequenceRecall {...gameProps} />;
        case 'quick_math':
          return (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setActiveGame('menu')}>← Back</Button>
              <Card className="glass-panel border-primary/20">
                <CardHeader><CardTitle className="font-game">🧮 Quick Math</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-center font-game text-3xl text-primary">{a} {op} {b} = ?</p>
                  <div className="flex gap-2">
                    <Input value={answer} onChange={e => setAnswer(e.target.value)} type="number" placeholder="Answer" className="text-center text-xl" autoFocus
                      onKeyDown={e => { if (e.key === 'Enter') submitMath(); }} />
                    <Button onClick={submitMath} className="bg-primary">Check</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        case 'number_recall':
          return (
            <div className="space-y-4">
              <Button variant="ghost" onClick={() => setActiveGame('menu')}>← Back</Button>
              <Card className="glass-panel border-primary/20">
                <CardHeader><CardTitle className="font-game">🔢 Number Recall</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Button onClick={startRecall} variant="outline" className="w-full">Flash 5-digit number (2.5s)</Button>
                  {showRecall && <p className="text-4xl font-game tracking-[0.4em] text-center text-primary animate-pulse">{recallNumber}</p>}
                  {!showRecall && recallNumber && (
                    <div className="flex gap-2">
                      <Input value={recallInput} onChange={e => setRecallInput(e.target.value)} placeholder="Type number" className="text-center text-xl"
                        onKeyDown={e => { if (e.key === 'Enter') submitRecall(); }} autoFocus />
                      <Button onClick={submitRecall}>Submit</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        default: return null;
      }
    };

    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="px-4 py-6 max-w-lg mx-auto">{renderGame()}</main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">🧠 Brain Gym</h1>
          <div className="w-16" />
        </div>

        {/* Daily Brain Score */}
        <div className="glass-panel rounded-2xl p-4 border border-primary/30 text-center">
          <p className="text-xs text-muted-foreground">Today's Brain Score</p>
          <p className="font-game text-4xl text-primary">{brainScore}</p>
          <p className="text-xs text-muted-foreground mt-1">{dailyScores.length} games played today</p>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-2 gap-3">
          {games.map(game => (
            <button key={game.id} onClick={() => setActiveGame(game.id)}
              className="glass-panel rounded-xl p-4 border border-white/10 hover:border-primary/40 transition-all text-left space-y-2 active:scale-95">
              <div className={cn('w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-xl', game.color)}>
                {game.emoji}
              </div>
              <h3 className="font-game text-xs">{game.name}</h3>
              <p className="text-[10px] text-muted-foreground">{game.desc}</p>
            </button>
          ))}
        </div>

        {/* Recent Scores */}
        {dailyScores.length > 0 && (
          <Card className="glass-panel border-primary/20">
            <CardHeader><CardTitle className="text-sm font-game">Recent Games</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {dailyScores.slice(0, 8).map((row, idx) => (
                <div key={`${row.created_at}-${idx}`} className="text-xs border border-border rounded-md px-3 py-2 flex justify-between">
                  <span>{games.find(g => g.id === row.game_type)?.emoji || '🎮'} {row.game_type}</span>
                  <span className="text-primary font-game">{row.score} pts</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default MindGamesPage;
