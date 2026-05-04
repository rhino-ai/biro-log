import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Moon, X } from 'lucide-react';

const KEY = 'biro-nightly-checkin-date';

export const NightlyCheckinBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const check = () => {
      const now = new Date();
      const h = now.getHours();
      const today = now.toISOString().slice(0, 10);
      const last = localStorage.getItem(KEY);
      // Show between 10pm and 1am if not dismissed today
      if ((h >= 22 || h < 1) && last !== today) setShow(true);
      else setShow(false);
    };
    check();
    const t = setInterval(check, 60_000);
    return () => clearInterval(t);
  }, []);

  if (!show) return null;
  const dismiss = () => {
    localStorage.setItem(KEY, new Date().toISOString().slice(0, 10));
    setShow(false);
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-orange-500/10 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Moon className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-game text-sm text-amber-500">10 PM Check-in</h3>
            <p className="text-xs text-muted-foreground mt-1">Mentor wants to know how today went. 5 min ka time?</p>
            <Link to="/mentor" onClick={dismiss}
              className="inline-block mt-2 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-game">
              Start Check-in →
            </Link>
          </div>
        </div>
        <button onClick={dismiss} className="opacity-50 hover:opacity-100"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
};