import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface Props { onScore: (score: number) => void; onBack: () => void; }

export const FocusDot = ({ onScore, onBack }: Props) => {
  const [phase, setPhase] = useState<'idle' | 'playing' | 'done'>('idle');
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [tracking, setTracking] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [bestTime, setBestTime] = useState(0);
  const areaRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const startRef = useRef(0);
  const velRef = useRef({ vx: 2, vy: 1.5 });

  const moveDot = useCallback(() => {
    setPos(prev => {
      let { x, y } = prev;
      let { vx, vy } = velRef.current;
      x += vx;
      y += vy;
      if (x < 5 || x > 95) { vx = -vx + (Math.random() - 0.5); velRef.current.vx = vx; }
      if (y < 5 || y > 95) { vy = -vy + (Math.random() - 0.5); velRef.current.vy = vy; }
      // Random direction changes
      if (Math.random() < 0.02) { velRef.current.vx += (Math.random() - 0.5) * 2; velRef.current.vy += (Math.random() - 0.5) * 2; }
      // Speed limit
      const speed = Math.sqrt(velRef.current.vx ** 2 + velRef.current.vy ** 2);
      if (speed > 4) { velRef.current.vx *= 3.5 / speed; velRef.current.vy *= 3.5 / speed; }
      return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
    });
    if (phase === 'playing') animRef.current = requestAnimationFrame(moveDot);
  }, [phase]);

  useEffect(() => {
    if (phase === 'playing') {
      startRef.current = Date.now();
      velRef.current = { vx: 1.5 + Math.random(), vy: 1 + Math.random() };
      animRef.current = requestAnimationFrame(moveDot);
    }
    return () => cancelAnimationFrame(animRef.current);
  }, [phase, moveDot]);

  useEffect(() => {
    if (phase !== 'playing') return;
    const interval = setInterval(() => {
      if (tracking) setElapsed(Math.floor((Date.now() - startRef.current) / 100) / 10);
    }, 100);
    return () => clearInterval(interval);
  }, [phase, tracking]);

  const handlePointer = (e: React.PointerEvent) => {
    if (phase !== 'playing' || !areaRef.current) return;
    const rect = areaRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const dist = Math.sqrt((px - pos.x) ** 2 + (py - pos.y) ** 2);
    if (dist > 8) {
      setTracking(false);
      const time = Math.floor((Date.now() - startRef.current) / 100) / 10;
      setBestTime(b => Math.max(b, time));
      onScore(Math.round(time * 10));
      setPhase('done');
    }
  };

  const startTracking = () => { setTracking(true); startRef.current = Date.now(); };

  if (phase === 'idle') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">🎯</div>
        <h2 className="font-game text-lg">Focus Dot</h2>
        <p className="text-sm text-muted-foreground">Keep your finger/cursor on the dot as long as possible</p>
        <Button onClick={() => { setPhase('playing'); setElapsed(0); }} className="bg-primary">Start</Button>
        <Button variant="ghost" onClick={onBack}>Back</Button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="text-center space-y-4 py-8">
        <div className="text-4xl">⏱️</div>
        <p className="font-game text-3xl text-primary">{elapsed}s</p>
        <p className="text-sm text-muted-foreground">Best: {bestTime}s</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setPhase('playing'); setElapsed(0); }} className="bg-primary">Again</Button>
          <Button variant="outline" onClick={onBack}>Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between"><span className="font-game text-accent">{elapsed}s</span><span className="text-sm text-muted-foreground">Keep on the dot!</span></div>
      <div ref={areaRef} onPointerMove={handlePointer} onPointerDown={startTracking}
        className="relative w-full h-64 rounded-2xl bg-secondary/30 border border-border overflow-hidden touch-none cursor-crosshair">
        <div className="absolute w-8 h-8 rounded-full bg-primary glow-purple transition-none"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }} />
      </div>
    </div>
  );
};
