import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props { onScore: (score: number) => void; onBack: () => void; }

export const PatternMemory = ({ onScore, onBack }: Props) => {
  const [phase, setPhase] = useState<'show' | 'input' | 'gameover'>('show');
  const [pattern, setPattern] = useState<number[]>([]);
  const [userPattern, setUserPattern] = useState<number[]>([]);
  const [round, setRound] = useState(1);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(15);
  const gridSize = 25;
  const cellCount = 2 + round;

  const generatePattern = useCallback(() => {
    const cells = new Set<number>();
    while (cells.size < Math.min(cellCount, gridSize)) cells.add(Math.floor(Math.random() * gridSize));
    return Array.from(cells);
  }, [cellCount]);

  useEffect(() => {
    const p = generatePattern();
    setPattern(p);
    setUserPattern([]);
    setPhase('show');
    const t = setTimeout(() => { setPhase('input'); setTimer(15); }, 3000);
    return () => clearTimeout(t);
  }, [round, generatePattern]);

  useEffect(() => {
    if (phase !== 'input') return;
    if (timer <= 0) { checkAnswer(); return; }
    const interval = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(interval);
  }, [phase, timer]);

  const toggleCell = (idx: number) => {
    if (phase !== 'input') return;
    setUserPattern(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
  };

  const checkAnswer = () => {
    const correct = pattern.every(p => userPattern.includes(p)) && userPattern.every(u => pattern.includes(u));
    if (correct) {
      const pts = round * 10;
      setScore(s => s + pts);
      setRound(r => r + 1);
    } else {
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives <= 0) {
        setPhase('gameover');
        onScore(score);
      } else {
        setRound(r => r); // re-trigger
        const p = generatePattern();
        setPattern(p);
        setUserPattern([]);
        setPhase('show');
        setTimeout(() => { setPhase('input'); setTimer(15); }, 3000);
      }
    }
  };

  if (phase === 'gameover') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">💀</div>
        <h2 className="font-game text-xl text-raid">Game Over!</h2>
        <p className="text-2xl font-game text-primary">{score} pts</p>
        <p className="text-sm text-muted-foreground">Round {round} reached</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setRound(1); setLives(3); setScore(0); }} className="bg-primary">Try Again</Button>
          <Button variant="outline" onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-1">{Array.from({ length: 3 }).map((_, i) => <span key={i} className={i < lives ? 'text-lg' : 'text-lg opacity-20'}>❤️</span>)}</div>
        <span className="font-game text-sm text-primary">Round {round}</span>
        <span className="font-game text-sm text-accent">{score} pts</span>
      </div>
      {phase === 'input' && <div className="text-center text-sm text-muted-foreground">⏱️ {timer}s left</div>}
      {phase === 'show' && <div className="text-center text-sm text-accent animate-pulse">Memorize the pattern...</div>}
      <div className="grid grid-cols-5 gap-1.5 max-w-[280px] mx-auto">
        {Array.from({ length: gridSize }).map((_, idx) => {
          const isPattern = pattern.includes(idx);
          const isSelected = userPattern.includes(idx);
          return (
            <button key={idx} onClick={() => toggleCell(idx)}
              className={cn('w-12 h-12 rounded-lg border transition-all duration-200',
                phase === 'show' && isPattern && 'bg-primary border-primary glow-purple scale-105',
                phase === 'show' && !isPattern && 'bg-secondary/30 border-border',
                phase === 'input' && isSelected && 'bg-accent border-accent glow-green',
                phase === 'input' && !isSelected && 'bg-secondary/30 border-border hover:border-primary/50',
              )} />
          );
        })}
      </div>
      {phase === 'input' && (
        <Button onClick={checkAnswer} className="w-full bg-primary">Submit Pattern</Button>
      )}
    </div>
  );
};
