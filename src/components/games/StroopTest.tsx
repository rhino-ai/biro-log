import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props { onScore: (score: number) => void; onBack: () => void; }

const COLORS = [
  { name: 'RED', hsl: '0 84% 60%' },
  { name: 'BLUE', hsl: '220 70% 55%' },
  { name: 'GREEN', hsl: '145 63% 49%' },
  { name: 'YELLOW', hsl: '48 96% 53%' },
  { name: 'PURPLE', hsl: '263 70% 58%' },
];

export const StroopTest = ({ onScore, onBack }: Props) => {
  const [phase, setPhase] = useState<'ready' | 'playing' | 'done'>('ready');
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(60);
  const [wordIdx, setWordIdx] = useState(0);
  const [colorIdx, setColorIdx] = useState(1);
  const [total, setTotal] = useState(0);

  const newRound = useCallback(() => {
    const w = Math.floor(Math.random() * COLORS.length);
    let c = Math.floor(Math.random() * COLORS.length);
    while (c === w) c = Math.floor(Math.random() * COLORS.length);
    setWordIdx(w);
    setColorIdx(c);
  }, []);

  useEffect(() => {
    if (phase !== 'playing') return;
    if (timer <= 0) { setPhase('done'); onScore(score); return; }
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [phase, timer, score, onScore]);

  const start = () => { setPhase('playing'); setScore(0); setTimer(60); setTotal(0); newRound(); };

  const answer = (idx: number) => {
    setTotal(t => t + 1);
    if (idx === colorIdx) setScore(s => s + 1);
    newRound();
  };

  if (phase === 'ready') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">🎨</div>
        <h2 className="font-game text-lg">Stroop Test</h2>
        <p className="text-sm text-muted-foreground">Tap the <strong>INK COLOR</strong>, not the word!</p>
        <Button onClick={start} className="bg-primary">Start (60s)</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    );
  }

  if (phase === 'done') {
    const pct = total > 0 ? Math.round((score / total) * 100) : 0;
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">🧠</div>
        <h2 className="font-game text-xl text-primary">{score}/{total} correct</h2>
        <p className="text-sm text-muted-foreground">{pct}% accuracy</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={start} className="bg-primary">Try Again</Button>
          <Button variant="outline" onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-between">
        <span className="font-game text-accent">{score} correct</span>
        <span className="font-game text-sm text-muted-foreground">⏱️ {timer}s</span>
      </div>
      <div className="text-center py-8">
        <span className="font-game text-5xl" style={{ color: `hsl(${COLORS[colorIdx].hsl})` }}>
          {COLORS[wordIdx].name}
        </span>
        <p className="text-xs text-muted-foreground mt-2">Tap the INK COLOR ↓</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {COLORS.map((c, i) => (
          <button key={c.name} onClick={() => answer(i)}
            className="py-3 rounded-xl border border-border font-game text-sm transition-transform active:scale-95"
            style={{ backgroundColor: `hsl(${c.hsl} / 0.2)`, color: `hsl(${c.hsl})` }}>
            {c.name}
          </button>
        ))}
      </div>
    </div>
  );
};
