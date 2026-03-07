import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props { onScore: (score: number) => void; onBack: () => void; }

const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const SequenceRecall = ({ onScore, onBack }: Props) => {
  const [phase, setPhase] = useState<'idle' | 'show' | 'input' | 'done'>('idle');
  const [sequence, setSequence] = useState('');
  const [input, setInput] = useState('');
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const seqLen = 3 + round;

  const generate = () => {
    let s = '';
    for (let i = 0; i < seqLen; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const startRound = () => {
    const s = generate();
    setSequence(s);
    setInput('');
    setPhase('show');
    setTimeout(() => setPhase('input'), 2000);
  };

  const check = () => {
    if (input.toUpperCase() === sequence) {
      setScore(s => s + round * 15);
      setRound(r => r + 1);
      startRound();
    } else {
      const nl = lives - 1;
      setLives(nl);
      if (nl <= 0) { setPhase('done'); onScore(score); }
      else startRound();
    }
  };

  if (phase === 'idle') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">🔤</div>
        <h2 className="font-game text-lg">Sequence Recall</h2>
        <p className="text-sm text-muted-foreground">Memorize and type back the sequence!</p>
        <Button onClick={() => { setRound(1); setScore(0); setLives(3); startRound(); }} className="bg-primary">Start</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">💀</div>
        <h2 className="font-game text-xl text-raid">Game Over</h2>
        <p className="font-game text-2xl text-primary">{score} pts</p>
        <p className="text-sm text-muted-foreground">Reached length {seqLen}</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setRound(1); setScore(0); setLives(3); startRound(); }} className="bg-primary">Again</Button>
          <Button variant="outline" onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="flex justify-between items-center">
        <div className="flex gap-1">{Array.from({ length: 3 }).map((_, i) => <span key={i} className={i < lives ? '' : 'opacity-20'}>❤️</span>)}</div>
        <span className="font-game text-sm text-primary">Round {round}</span>
        <span className="font-game text-sm text-accent">{score} pts</span>
      </div>
      {phase === 'show' && (
        <div className="text-center py-12">
          <p className="text-xs text-muted-foreground mb-2">Memorize!</p>
          <p className="font-game text-4xl tracking-[0.5em] text-primary animate-pulse">{sequence}</p>
        </div>
      )}
      {phase === 'input' && (
        <div className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">Type the sequence ({seqLen} chars)</p>
          <Input value={input} onChange={e => setInput(e.target.value.toUpperCase())} placeholder="Type here..."
            className="text-center font-game text-2xl tracking-widest bg-secondary/50"
            maxLength={seqLen} autoFocus />
          <Button onClick={check} className="w-full bg-primary" disabled={input.length !== seqLen}>Check</Button>
        </div>
      )}
    </div>
  );
};
