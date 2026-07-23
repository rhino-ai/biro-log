import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { Skull, Flame, Lock, Unlock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const QUOTES = [
  '"Talent without discipline is nothing." — Conor McGregor',
  '"Pain is temporary. Quitting lasts forever." — Lance Armstrong',
  '"You don\'t rise to the level of your goals. You fall to the level of your systems." — James Clear',
  '"Discipline equals freedom." — Jocko Willink',
  '"Hard choices, easy life. Easy choices, hard life." — Jerzy Gregorek',
];

const VillainModePage = () => {
  const [searchParams] = useSearchParams();
  const locked = searchParams.get('locked') === '1';
  const [active, setActive] = useState(false);
  const [minutes, setMinutes] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [quote, setQuote] = useState(QUOTES[0]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          setActive(false);
          toast({ title: '🔥 Villain session complete', description: 'You survived. Reward yourself with rest.' });
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    const qInt = window.setInterval(() => setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]), 8000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(qInt);
    };
  }, [active]);

  // Block back/leave attempts when active
  useEffect(() => {
    if (!active) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [active]);

  const start = () => {
    setRemaining(minutes * 60);
    setActive(true);
  };
  const surrender = () => {
    if (!confirm('Surrender? You will lose all session XP. Are you weak?')) return;
    setActive(false);
    setRemaining(0);
    toast({ title: '😤 Surrendered', description: 'Try again. The villain never quits twice.', variant: 'destructive' });
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
  const ss = (remaining % 60).toString().padStart(2, '0');

  if (active) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center p-6"
        style={{ background: 'radial-gradient(circle at center, #2a0000 0%, #0a0000 100%)' }}>
        <Skull className="w-24 h-24 text-red-600 animate-pulse mb-6" />
        <h1 className="font-game text-5xl text-red-500 mb-2 tracking-widest" style={{ textShadow: '0 0 30px #ff0000' }}>
          VILLAIN MODE
        </h1>
        <p className="text-red-300/70 text-sm mb-8 italic max-w-md">{quote}</p>
        <div className="font-game text-7xl text-red-100 mb-2" style={{ textShadow: '0 0 20px #ff0000' }}>{mm}:{ss}</div>
        <p className="text-red-400/60 text-xs mb-10 flex items-center gap-2"><Lock className="w-3 h-3" /> Distraction lock engaged</p>
        <Button variant="outline" onClick={surrender}
          className="border-red-700 text-red-400 hover:bg-red-950 hover:text-red-200">
          <Unlock className="w-4 h-4 mr-2" /> Surrender (lose XP)
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <BackButton to="/" />
        {locked && (
          <div className="glass-panel rounded-2xl p-4 border border-red-700 bg-red-950/40 text-center space-y-2">
            <p className="text-red-300 font-game text-sm">🔒 Strict Read Mode — Daily limit crossed</p>
            <p className="text-red-200/80 text-xs">Social, games & library are locked. Only Tasks, Mentor, Revision & Journal remain.</p>
            <div className="flex gap-2 justify-center pt-2">
              <Link to="/tasks" className="text-xs underline text-red-300">Go to Tasks</Link>
              <span className="text-red-500/40">•</span>
              <Link to="/mentor" className="text-xs underline text-red-300">Ask Mentor</Link>
              <span className="text-red-500/40">•</span>
              <Link to="/screen-time" className="text-xs underline text-red-300">Settings</Link>
            </div>
          </div>
        )}
        <div className="text-center">
          <Skull className="w-16 h-16 text-red-500 mx-auto mb-3" />
          <h1 className="font-game text-3xl text-red-500 tracking-wider">VILLAIN MODE</h1>
          <p className="text-muted-foreground text-sm mt-2">No mercy. No distractions. Pure work.</p>
        </div>
        <div className="glass-panel rounded-2xl p-5 border border-red-900/50 bg-red-950/10 space-y-4">
          <div>
            <label className="text-xs text-red-400 mb-2 block">Session length (minutes)</label>
            <div className="grid grid-cols-4 gap-2">
              {[30, 60, 90, 120].map((m) => (
                <button key={m} onClick={() => setMinutes(m)}
                  className={`py-2 rounded-lg border text-sm font-game transition ${minutes === m ? 'border-red-500 bg-red-950 text-red-200' : 'border-red-900/40 text-red-400/60'}`}>
                  {m}m
                </button>
              ))}
            </div>
          </div>
          <Button onClick={start} className="w-full bg-red-700 hover:bg-red-600 text-white font-game tracking-wider">
            <Flame className="w-4 h-4 mr-2" /> ENGAGE VILLAIN MODE
          </Button>
        </div>
        <div className="glass-panel rounded-2xl p-4 border border-red-900/30 text-xs text-red-300/70 space-y-2">
          <p>⚠️ While active: navigation locked, exit warning, only surrender (with XP loss) ends session early.</p>
          <p>🔥 Survive the full session for bonus XP and a Villain badge.</p>
        </div>
      </main>
    </div>
  );
};

export default VillainModePage;