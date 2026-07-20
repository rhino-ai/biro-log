import { useEffect, useMemo, useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';

const STORAGE_KEY = 'biro-screen-time';
const USAGE_KEY = 'biro-app-usage'; // { [YYYY-MM-DD]: minutes }

const BLOCKED_ROUTES = ['/friends', '/biro-yaar', '/mind-games', '/virtual-library', '/leaderboard'];
const ALWAYS_ALLOW = ['/villain', '/auth', '/tasks', '/mentor', '/', '/screen-time', '/journal', '/revision'];

function today() { return new Date().toISOString().split('T')[0]; }

function readSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { strictReadMode: false, dailyLimitHours: 4 };
    const d = JSON.parse(raw);
    return {
      strictReadMode: !!d.strictReadMode,
      dailyLimitHours: typeof d.dailyLimitHours === 'number' ? d.dailyLimitHours : 4,
    };
  } catch { return { strictReadMode: false, dailyLimitHours: 4 }; }
}

function readUsageMinutes(): number {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return 0;
    const d = JSON.parse(raw);
    return Number(d[today()] || 0);
  } catch { return 0; }
}

function bumpUsage(mins: number) {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    const d = raw ? JSON.parse(raw) : {};
    d[today()] = Number(d[today()] || 0) + mins;
    localStorage.setItem(USAGE_KEY, JSON.stringify(d));
  } catch { /* ignore */ }
}

export const ReadModeGuard = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const [tick, setTick] = useState(0);

  // Track active in-app minutes (only while tab visible)
  useEffect(() => {
    let last = Date.now();
    const interval = setInterval(() => {
      if (document.visibilityState !== 'visible') { last = Date.now(); return; }
      const now = Date.now();
      const elapsedMin = (now - last) / 60000;
      last = now;
      if (elapsedMin > 0 && elapsedMin < 5) bumpUsage(elapsedMin);
      setTick((t) => t + 1);
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  const { strictReadMode, dailyLimitHours } = useMemo(readSettings, [tick, location.pathname]);
  const usedMin = useMemo(readUsageMinutes, [tick, location.pathname]);
  const overLimit = strictReadMode && usedMin >= dailyLimitHours * 60;

  const shouldBlock =
    overLimit &&
    BLOCKED_ROUTES.some((r) => location.pathname === r || location.pathname.startsWith(r + '/')) &&
    !ALWAYS_ALLOW.includes(location.pathname);

  if (shouldBlock) return <Navigate to="/villain?locked=1" replace />;
  return <>{children}</>;
};

export const readModeStatus = () => {
  const { strictReadMode, dailyLimitHours } = readSettings();
  const usedMin = readUsageMinutes();
  return { strictReadMode, dailyLimitHours, usedMin, overLimit: strictReadMode && usedMin >= dailyLimitHours * 60 };
};