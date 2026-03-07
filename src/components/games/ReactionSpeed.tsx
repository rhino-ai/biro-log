import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props { onScore: (score: number) => void; onBack: () => void; }

export const ReactionSpeed = ({ onScore, onBack }: Props) => {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'result' | 'done'>('idle');
  const [times, setTimes] = useState<number[]>([]);
  const [current, setCurrent] = useState(0);
  const [round, setRound] = useState(0);
  const startRef = useRef(0);
  const timerRef = useRef<any>(null);
  const maxRounds = 10;

  const startRound = useCallback(() => {
    setPhase('wait');
    const delay = 1000 + Math.random() * 4000;
    timerRef.current = setTimeout(() => {
      startRef.current = performance.now();
      setPhase('go');
    }, delay);
  }, []);

  const tap = () => {
    if (phase === 'wait') {
      clearTimeout(timerRef.current);
      setPhase('result');
      setCurrent(-1); // too early
      return;
    }
    if (phase === 'go') {
      const ms = Math.round(performance.now() - startRef.current);
      setCurrent(ms);
      setTimes(prev => [...prev, ms]);
      setPhase('result');
    }
  };

  const next = () => {
    const nextRound = round + 1;
    if (nextRound >= maxRounds) {
      setPhase('done');
      const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
      onScore(Math.max(0, 500 - avg));
      return;
    }
    setRound(nextRound);
    startRound();
  };

  const getLabel = (ms: number) => {
    if (ms < 150) return { text: '⚡ Elite', color: 'text-accent' };
    if (ms < 250) return { text: '✅ Good', color: 'text-primary' };
    return { text: '🔄 Train More', color: 'text-coins' };
  };

  if (phase === 'idle') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">⚡</div>
        <h2 className="font-game text-lg">Reaction Speed</h2>
        <p className="text-sm text-muted-foreground">Tap as fast as you can when the screen turns green!</p>
        <Button onClick={() => { setRound(0); setTimes([]); startRound(); }} className="bg-primary">Start</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    );
  }

  if (phase === 'done') {
    const avg = times.length > 0 ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    const best = times.length > 0 ? Math.min(...times) : 0;
    const label = getLabel(avg);
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">🏆</div>
        <h2 className="font-game text-lg text-primary">Results</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-panel rounded-xl p-3"><p className="text-xs text-muted-foreground">Average</p><p className="font-game text-xl">{avg}ms</p></div>
          <div className="glass-panel rounded-xl p-3"><p className="text-xs text-muted-foreground">Best</p><p className="font-game text-xl text-accent">{best}ms</p></div>
        </div>
        <p className={cn('font-game', label.color)}>{label.text}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setRound(0); setTimes([]); setPhase('idle'); }} className="bg-primary">Again</Button>
          <Button variant="outline" onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  if (phase === 'result') {
    return (
      <div className="text-center space-y-4 py-12">
        {current === -1 ? (
          <>
            <div className="text-4xl">❌</div>
            <p className="font-game text-raid">Too early!</p>
          </>
        ) : (
          <>
            <p className="font-game text-4xl text-primary">{current}ms</p>
            <p className={cn('font-game', getLabel(current).color)}>{getLabel(current).text}</p>
          </>
        )}
        <p className="text-sm text-muted-foreground">Round {round + 1}/{maxRounds}</p>
        <Button onClick={next} className="bg-primary">{round + 1 >= maxRounds ? 'See Results' : 'Next'}</Button>
      </div>
    );
  }

  return (
    <button onClick={tap}
      className={cn('w-full h-64 rounded-2xl flex items-center justify-center transition-all duration-200 border-2',
        phase === 'wait' && 'bg-raid/20 border-raid/50',
        phase === 'go' && 'bg-accent/30 border-accent glow-green animate-pulse',
      )}>
      <span className="font-game text-lg">
        {phase === 'wait' ? '⏳ Wait...' : '🟢 TAP NOW!'}
      </span>
    </button>
  );
};
