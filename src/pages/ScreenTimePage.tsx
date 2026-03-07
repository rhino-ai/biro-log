import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

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
  }>({
    apps: defaultApps, seasons: [], focusMode: false, shortsBlocker: false,
    dailyUsage: {}, streakDays: 0, bestStreak: 0, graceDaysUsed: 0, achievements: ['first_step'],
  });
  const [newAppName, setNewAppName] = useState('');
  const [newSeasonName, setNewSeasonName] = useState('');

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
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">📱 Digital Discipline</h1>
          <div className="w-12" />
        </div>

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
      <BottomNav />
    </div>
  );
};

export default ScreenTimePage;
