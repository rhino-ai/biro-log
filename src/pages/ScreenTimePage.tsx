import { useState, useEffect } from 'react';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { usageStats, type AppUsage } from '@/lib/usageStats';
import { Capacitor } from '@capacitor/core';
import { Smartphone, ShieldCheck, ExternalLink, RefreshCw } from 'lucide-react';

const STORAGE_KEY = 'biro-screen-time';

interface AppLimit { id: string; name: string; limitHours: number; emoji: string; }
interface Season { id: string; name: string; startTime: string; endTime: string; days: number[]; active: boolean; }

const defaultApps: AppLimit[] = [
  { id: '1', name: 'YouTube', limitHours: 1, emoji: '📺' },
  { id: '2', name: 'Instagram', limitHours: 0.5, emoji: '📷' },
  { id: '3', name: 'WhatsApp', limitHours: 1, emoji: '💬' },
  { id: '4', name: 'Games', limitHours: 0.5, emoji: '🎮' },
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ScreenTimePage = () => {
  const [data, setData] = useState<{
    apps: AppLimit[];
    seasons: Season[];
    focusMode: boolean;
    shortsBlocker: boolean;
    dailyUsage: Record<string, number>;
    streakDays: number;
    bestStreak: number;
    graceDaysUsed: number;
    achievements: string[];
    strictReadMode?: boolean;
    dailyLimitHours?: number;
  }>({
    apps: defaultApps, seasons: [], focusMode: false, shortsBlocker: false,
    dailyUsage: {}, streakDays: 0, bestStreak: 0, graceDaysUsed: 0, achievements: ['first_step'],
    strictReadMode: false, dailyLimitHours: 4,
  });
  const [newAppName, setNewAppName] = useState('');
  const [newSeasonName, setNewSeasonName] = useState('');

  // ---- Real device usage (Android native) ----
  const platform = Capacitor.getPlatform();
  const nativeAvailable = usageStats.available();
  const [permGranted, setPermGranted] = useState(false);
  const [nativeApps, setNativeApps] = useState<AppUsage[]>([]);
  const [nativeTotalToday, setNativeTotalToday] = useState(0);
  const [loadingNative, setLoadingNative] = useState(false);

  const refreshNative = async () => {
    if (!nativeAvailable) return;
    setLoadingNative(true);
    try {
      const granted = await usageStats.hasPermission();
      setPermGranted(granted);
      if (granted) {
        const r = await usageStats.getDailyUsage(7);
        setNativeApps(r.apps);
        setNativeTotalToday(r.totalMinutesToday);
      }
    } finally { setLoadingNative(false); }
  };

  useEffect(() => { refreshNative(); }, []);
  // Re-check permission when the tab regains focus (user came back from settings).
  useEffect(() => {
    const onVis = () => { if (!document.hidden) refreshNative(); };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setData(JSON.parse(stored));
  }, []);

  const save = (d: typeof data) => { setData(d); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); };

  // Simulated weekly usage data
  const weekData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    return {
      day: d.toLocaleDateString('en', { weekday: 'short' }),
      hours: data.dailyUsage[key] || Math.round((3 + Math.random() * 5) * 10) / 10,
      date: key,
    };
  });

  const todayHours = weekData[6].hours;
  const isUnder8h = todayHours < 8;

  const addApp = () => {
    if (!newAppName.trim()) return;
    const app: AppLimit = { id: crypto.randomUUID(), name: newAppName.trim(), limitHours: 1, emoji: '📱' };
    save({ ...data, apps: [...data.apps, app] });
    setNewAppName('');
  };

  const toggleFocus = () => save({ ...data, focusMode: !data.focusMode });
  const toggleShorts = () => save({ ...data, shortsBlocker: !data.shortsBlocker });
  const toggleStrict = () => {
    const next = !data.strictReadMode;
    save({ ...data, strictReadMode: next });
    toast({ title: next ? '🔒 Strict Read Mode ON' : 'Strict Read Mode off', description: next ? `Social & games blocked after ${data.dailyLimitHours ?? 4}h in-app.` : 'Blocks removed.' });
  };
  const setLimit = (v: number) => save({ ...data, dailyLimitHours: Math.max(1, Math.min(12, v)) });

  const achievements = [
    { id: 'first_step', name: 'First Step', emoji: '🌱', req: 1 },
    { id: '3d', name: '3 Day Goal', emoji: '🔥', req: 3 },
    { id: '7d', name: '7 Day Goal', emoji: '⭐', req: 7 },
    { id: '14d', name: '14 Day Goal', emoji: '💎', req: 14 },
    { id: '21d', name: '21 Day Goal', emoji: '🏆', req: 21 },
    { id: '30d', name: '30 Day Goal', emoji: '👑', req: 30 },
    { id: '60d', name: '60 Day Goal', emoji: '🦁', req: 60 },
    { id: '90d', name: '90 Day Goal', emoji: '🐉', req: 90 },
  ];

  const maxBarHeight = 120;
  const maxHours = Math.max(...weekData.map(d => d.hours), 8);

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">📱 Digital Discipline</h1>
          <div className="w-12" />
        </div>

        {/* Real device usage — Android native */}
        {nativeAvailable && (
          <Card className="glass-panel border-primary/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-game flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" /> Real Device Usage
                <Button variant="ghost" size="icon" className="ml-auto h-7 w-7" onClick={refreshNative}>
                  <RefreshCw className={cn("w-3.5 h-3.5", loadingNative && "animate-spin")} />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs">
                  <p>Permission: <span className={permGranted ? 'text-green-400 font-semibold' : 'text-raid font-semibold'}>{permGranted ? 'Granted' : 'Not granted'}</span></p>
                  <p className="text-muted-foreground mt-1">Reads real per-app minutes from Android system usage stats.</p>
                </div>
                {!permGranted && (
                  <Button size="sm" className="bg-primary" onClick={async () => {
                    try { await usageStats.requestPermission(); toast({ title: 'Enable "Biro-log" in Usage access' }); }
                    catch { toast({ title: 'Could not open settings' }); }
                  }}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Grant access
                  </Button>
                )}
              </div>
              {permGranted && (
                <>
                  <div className="rounded-lg bg-secondary/40 p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Today (all apps)</p>
                    <p className="text-2xl font-game text-primary">
                      {Math.floor(nativeTotalToday / 60)}h {nativeTotalToday % 60}m
                    </p>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {[...nativeApps]
                      .filter(a => a.date === new Date().toISOString().slice(0, 10))
                      .sort((a, b) => b.minutes - a.minutes)
                      .slice(0, 15)
                      .map(a => (
                        <div key={a.packageName} className="flex items-center justify-between text-xs p-2 rounded-md bg-secondary/30">
                          <span className="truncate">{a.appName}</span>
                          <span className="text-muted-foreground shrink-0 ml-2">{Math.floor(a.minutes / 60)}h {a.minutes % 60}m</span>
                        </div>
                      ))}
                    {nativeApps.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No data yet — usage stats need a few minutes.</p>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* iOS fallback: deep-link to Screen Time (Apple blocks reading) */}
        {platform === 'ios' && (
          <Card className="glass-panel border-primary/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-game flex items-center gap-2">📱 iOS Screen Time</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">Apple doesn't let apps read your Screen Time data. Tap below to open Apple's Screen Time settings.</p>
              <Button size="sm" className="w-full bg-primary" onClick={() => usageStats.openIOSScreenTime()}>
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Open Screen Time settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Streak Card */}
        <div className="glass-panel rounded-2xl p-4 border border-coins/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-3xl animate-fire">🔥</span>
            <span className="font-game text-4xl text-coins">{data.streakDays}</span>
          </div>
          <p className="text-xs text-muted-foreground">Day Streak (under 8h rule)</p>
          <p className="text-[10px] text-muted-foreground mt-1">Best: {data.bestStreak} days • Grace: {3 - data.graceDaysUsed}/3</p>
        </div>

        {/* Focus & Shorts Toggle */}
        <div className="grid grid-cols-2 gap-3">
          <div className="glass-panel rounded-xl p-4 border border-primary/20 flex flex-col items-center gap-2">
            <span className="text-2xl">🎯</span>
            <p className="text-xs font-game">Focus Mode</p>
            <Switch checked={data.focusMode} onCheckedChange={toggleFocus} />
          </div>
          <div className="glass-panel rounded-xl p-4 border border-raid/20 flex flex-col items-center gap-2">
            <span className="text-2xl">🚫</span>
            <p className="text-xs font-game">Shorts Blocker</p>
            <Switch checked={data.shortsBlocker} onCheckedChange={toggleShorts} />
          </div>
        </div>

        {/* Strict Read Mode */}
        <Card className="glass-panel border-raid/30">
          <CardHeader><CardTitle className="text-sm font-game">🔒 Strict Read Mode</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs">Auto-block social, games & library when in-app time crosses the limit.</p>
                <p className="text-[10px] text-muted-foreground mt-1">Only Tasks, Mentor, Revision & Journal stay open.</p>
              </div>
              <Switch checked={!!data.strictReadMode} onCheckedChange={toggleStrict} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Daily in-app limit (hours):</span>
              <Input
                type="number" min={1} max={12}
                value={data.dailyLimitHours ?? 4}
                onChange={(e) => setLimit(Number(e.target.value))}
                className="bg-secondary/50 w-20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Weekly Chart */}
        <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle className="text-sm font-game">Weekly Screen Time</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-36">
              {weekData.map((d, i) => {
                const h = Math.round((d.hours / maxHours) * maxBarHeight);
                const isToday = i === 6;
                const over8 = d.hours >= 8;
                return (
                  <div key={i} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-[10px] text-muted-foreground">{d.hours}h</span>
                    <div className={cn('w-full rounded-t-md transition-all',
                      over8 ? 'bg-raid/60' : 'bg-accent/60',
                      isToday && 'ring-2 ring-primary',
                    )} style={{ height: `${h}px` }} />
                    <span className={cn('text-[10px]', isToday ? 'text-primary font-bold' : 'text-muted-foreground')}>{d.day}</span>
                  </div>
                );
              })}
            </div>
            <div className="h-px bg-raid/30 mt-2 relative">
              <span className="absolute right-0 -top-3 text-[10px] text-raid">8h limit</span>
            </div>
          </CardContent>
        </Card>

        {/* App Limits */}
        <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle className="text-sm font-game">App Limits</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.apps.map(app => (
              <div key={app.id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span>{app.emoji}</span>
                  <span className="text-sm">{app.name}</span>
                </div>
                <span className="text-xs text-muted-foreground">{app.limitHours}h/day</span>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={newAppName} onChange={e => setNewAppName(e.target.value)} placeholder="Add app..." className="bg-secondary/50" />
              <Button onClick={addApp} size="sm" className="bg-primary">Add</Button>
            </div>
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card className="glass-panel border-coins/20">
          <CardHeader><CardTitle className="text-sm font-game">🏅 Achievements</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-3">
              {achievements.map(a => {
                const unlocked = data.streakDays >= a.req;
                return (
                  <div key={a.id} className={cn('flex flex-col items-center gap-1 p-2 rounded-lg',
                    unlocked ? 'bg-coins/10 border border-coins/30' : 'opacity-30')}>
                    <span className="text-2xl">{a.emoji}</span>
                    <span className="text-[10px] text-center">{a.name}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ScreenTimePage;
