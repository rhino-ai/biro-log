import { useState, useEffect, useRef, useCallback } from 'react';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Settings, SkipForward } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface FocusTimerProps { className?: string; }

const alarmSounds = [
  { id: 'bell', name: '🔔 Bell', src: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'chime', name: '🎵 Chime', src: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
  { id: 'alert', name: '🚨 Alert', src: 'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3' },
  { id: 'success', name: '✅ Success', src: 'https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3' },
];

const ambientSounds = [
  { id: 'none', name: '🔇 None', src: '' },
  { id: 'rain', name: '🌧️ Rain', src: 'https://assets.mixkit.co/active_storage/sfx/199/199-preview.mp3' },
  { id: 'forest', name: '🌳 Forest', src: 'https://assets.mixkit.co/active_storage/sfx/2488/2488-preview.mp3' },
  { id: 'fire', name: '🔥 Fire', src: 'https://assets.mixkit.co/active_storage/sfx/2501/2501-preview.mp3' },
];

const subjects = ['Physics', 'Chemistry', 'Maths', 'Biology', 'English', 'Other'];

export const FocusTimer = ({ className }: FocusTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'short_break' | 'long_break'>('focus');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState(alarmSounds[0].id);
  const [ambientId, setAmbientId] = useState('none');
  const [earnedXP, setEarnedXP] = useState(0);
  const [earnedCoins, setEarnedCoins] = useState(0);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [subject, setSubject] = useState('Physics');
  const [autoStart, setAutoStart] = useState(false);
  const [settings, setSettings] = useState({ focusTime: 25, shortBreak: 5, longBreak: 15 });
  const [sessionLog, setSessionLog] = useState<{ subject: string; duration: number; completed: boolean; time: string }[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ambientRef = useRef<HTMLAudioElement | null>(null);
  const xpTick = useRef(0);
  const coinTick = useRef(0);
  const { addCoins, addXP } = useGame();

  // Keep screen awake
  useEffect(() => {
    if (!isRunning) return;
    let wakeLock: any = null;
    const acquire = async () => {
      try { wakeLock = await (navigator as any).wakeLock?.request('screen'); } catch {}
    };
    acquire();
    return () => { wakeLock?.release(); };
  }, [isRunning]);

  // Ambient sound
  useEffect(() => {
    if (ambientRef.current) { ambientRef.current.pause(); ambientRef.current = null; }
    if (ambientId === 'none' || !isRunning) return;
    const sound = ambientSounds.find(s => s.id === ambientId);
    if (sound?.src) {
      ambientRef.current = new Audio(sound.src);
      ambientRef.current.loop = true;
      ambientRef.current.volume = 0.3;
      ambientRef.current.play().catch(() => {});
    }
    return () => { ambientRef.current?.pause(); };
  }, [ambientId, isRunning]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
        if (mode === 'focus') {
          xpTick.current += 1;
          if (xpTick.current >= 15) { xpTick.current = 0; addXP(1); setEarnedXP(p => p + 1); }
          coinTick.current += 1;
          if (coinTick.current >= 30) { coinTick.current = 0; addCoins(1); setEarnedCoins(p => p + 1); }
        }
      }, 1000);
    } else if (timeLeft === 0) {
      if (mode === 'focus') {
        const bonusCoins = Math.floor(settings.focusTime / 5);
        const bonusXP = settings.focusTime;
        addCoins(bonusCoins); addXP(bonusXP);
        setEarnedCoins(p => p + bonusCoins); setEarnedXP(p => p + bonusXP);
        setPomodoroCount(c => c + 1);
        setSessionLog(prev => [{ subject, duration: settings.focusTime, completed: true, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...prev].slice(0, 20));

        const nextCount = pomodoroCount + 1;
        if (nextCount % 4 === 0) {
          setMode('long_break'); setTimeLeft(settings.longBreak * 60);
        } else {
          setMode('short_break'); setTimeLeft(settings.shortBreak * 60);
        }
      } else {
        setMode('focus'); setTimeLeft(settings.focusTime * 60);
      }
      playAlarm();
      setIsRunning(autoStart);
      xpTick.current = 0; coinTick.current = 0;
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, settings, addCoins, addXP, autoStart, pomodoroCount, subject]);

  const playAlarm = () => {
    if (!soundEnabled) return;
    const sound = alarmSounds.find(s => s.id === selectedSound);
    if (sound) { audioRef.current = new Audio(sound.src); audioRef.current.play().catch(() => {}); }
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  const resetTimer = () => {
    setIsRunning(false);
    const dur = mode === 'focus' ? settings.focusTime : mode === 'short_break' ? settings.shortBreak : settings.longBreak;
    setTimeLeft(dur * 60);
    xpTick.current = 0; coinTick.current = 0; setEarnedXP(0); setEarnedCoins(0);
  };

  const switchMode = (m: typeof mode) => {
    setMode(m); setIsRunning(false);
    const dur = m === 'focus' ? settings.focusTime : m === 'short_break' ? settings.shortBreak : settings.longBreak;
    setTimeLeft(dur * 60);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const totalSeconds = mode === 'focus' ? settings.focusTime * 60 : mode === 'short_break' ? settings.shortBreak * 60 : settings.longBreak * 60;
  const progress = ((totalSeconds - timeLeft) / totalSeconds) * 100;

  return (
    <div className={cn("glass-panel rounded-2xl border border-primary/20 p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏱️</span>
          <h3 className="font-game text-lg text-primary">Pomodoro</h3>
          <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full font-game">#{pomodoroCount}</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSoundEnabled(!soundEnabled)}>
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Settings className="w-4 h-4" /></Button></DialogTrigger>
            <DialogContent className="glass-panel border-primary/30">
              <DialogHeader><DialogTitle className="font-game text-primary">Timer Settings</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label className="text-xs">Focus (min)</Label><Input type="number" value={settings.focusTime} onChange={e => setSettings({ ...settings, focusTime: parseInt(e.target.value) || 25 })} className="bg-secondary/50" /></div>
                <div><Label className="text-xs">Short Break (min)</Label><Input type="number" value={settings.shortBreak} onChange={e => setSettings({ ...settings, shortBreak: parseInt(e.target.value) || 5 })} className="bg-secondary/50" /></div>
                <div><Label className="text-xs">Long Break (min)</Label><Input type="number" value={settings.longBreak} onChange={e => setSettings({ ...settings, longBreak: parseInt(e.target.value) || 15 })} className="bg-secondary/50" /></div>
                <div><Label className="text-xs">Alarm</Label>
                  <Select value={selectedSound} onValueChange={setSelectedSound}><SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{alarmSounds.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                <div><Label className="text-xs">Ambient Sound</Label>
                  <Select value={ambientId} onValueChange={setAmbientId}><SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{ambientSounds.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={autoStart} onChange={e => setAutoStart(e.target.checked)} /> Auto-start next session</label>
                <div className="glass-panel rounded-lg p-3 border border-accent/20 text-xs space-y-1">
                  <h4 className="font-game text-accent text-sm">⚡ Focus Rewards</h4>
                  <p>• 1 XP every 15s • 1 🪙 every 30s</p>
                  <p>• Bonus: {settings.focusTime} XP + {Math.floor(settings.focusTime / 5)} 🪙 on complete</p>
                  <p>• Long break every 4 pomodoros</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Subject + Mode */}
      <div className="flex gap-2 mb-4">
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="bg-secondary/50 flex-1 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>{subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <div className="flex gap-1 mb-6">
        {([['focus', '🎯 Focus'], ['short_break', '☕ Short'], ['long_break', '🌙 Long']] as const).map(([m, label]) => (
          <Button key={m} variant={mode === m ? 'default' : 'outline'} size="sm"
            className={cn("flex-1 text-xs", mode === m && (m === 'focus' ? 'bg-primary' : 'bg-accent'))}
            onClick={() => switchMode(m)}>{label}</Button>
        ))}
      </div>

      {/* Timer Display */}
      <div className="relative flex items-center justify-center mb-6">
        <svg className="w-48 h-48 -rotate-90">
          <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="8" className="text-secondary" />
          <circle cx="96" cy="96" r="88" fill="none" stroke="currentColor" strokeWidth="8"
            strokeDasharray={553} strokeDashoffset={553 - (553 * progress) / 100}
            className={cn("transition-all duration-1000", mode === 'focus' ? 'text-primary' : 'text-accent')} strokeLinecap="round" />
        </svg>
        <div className="absolute text-center">
          <div className={cn("font-game text-5xl", mode === 'focus' ? 'text-primary' : 'text-accent', isRunning && 'animate-pulse')}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">{subject} • {mode === 'focus' ? '🎯 Focus' : mode === 'short_break' ? '☕ Break' : '🌙 Long Break'}</div>
          {(earnedXP > 0 || earnedCoins > 0) && (
            <div className="text-xs text-accent mt-1 font-game animate-pulse">+{earnedXP} ⚡ +{earnedCoins} 🪙</div>
          )}
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button variant="outline" size="icon" onClick={resetTimer} className="w-12 h-12"><RotateCcw className="w-5 h-5" /></Button>
        <Button size="icon" onClick={toggleTimer}
          className={cn("w-16 h-16 rounded-full", mode === 'focus' ? 'bg-primary glow-purple' : 'bg-accent')}>
          {isRunning ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => { setTimeLeft(0); }} className="w-12 h-12"><SkipForward className="w-5 h-5" /></Button>
      </div>

      {/* Session Log */}
      {sessionLog.length > 0 && (
        <div className="mt-6 space-y-2">
          <h4 className="text-xs font-game text-muted-foreground">Session Log</h4>
          {sessionLog.slice(0, 5).map((s, i) => (
            <div key={i} className="text-xs flex justify-between bg-secondary/30 rounded-md px-3 py-1.5">
              <span>{s.duration}min {s.subject} — {s.completed ? '✅' : '❌'}</span>
              <span className="text-muted-foreground">{s.time}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
