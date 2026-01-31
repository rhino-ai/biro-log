import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FocusTimerProps {
  className?: string;
}

const alarmSounds = [
  { id: 'bell', name: '🔔 Bell', src: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3' },
  { id: 'chime', name: '🎵 Chime', src: 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3' },
  { id: 'alert', name: '🚨 Alert', src: 'https://assets.mixkit.co/active_storage/sfx/2866/2866-preview.mp3' },
  { id: 'success', name: '✅ Success', src: 'https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3' },
];

export const FocusTimer = ({ className }: FocusTimerProps) => {
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes default
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState(alarmSounds[0].id);
  const [settings, setSettings] = useState({
    focusTime: 25,
    breakTime: 5,
  });
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      // Timer completed
      playAlarm();
      if (mode === 'focus') {
        setMode('break');
        setTimeLeft(settings.breakTime * 60);
      } else {
        setMode('focus');
        setTimeLeft(settings.focusTime * 60);
      }
      setIsRunning(false);
    }

    return () => clearInterval(interval);
  }, [isRunning, timeLeft, mode, settings]);

  const playAlarm = () => {
    if (!soundEnabled) return;
    const sound = alarmSounds.find(s => s.id === selectedSound);
    if (sound) {
      audioRef.current = new Audio(sound.src);
      audioRef.current.play().catch(console.error);
    }
  };

  const toggleTimer = () => setIsRunning(!isRunning);
  
  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(mode === 'focus' ? settings.focusTime * 60 : settings.breakTime * 60);
  };

  const switchMode = (newMode: 'focus' | 'break') => {
    setMode(newMode);
    setIsRunning(false);
    setTimeLeft(newMode === 'focus' ? settings.focusTime * 60 : settings.breakTime * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = mode === 'focus' 
    ? ((settings.focusTime * 60 - timeLeft) / (settings.focusTime * 60)) * 100
    : ((settings.breakTime * 60 - timeLeft) / (settings.breakTime * 60)) * 100;

  return (
    <div className={cn("glass-panel rounded-2xl border border-primary/20 p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⏱️</span>
          <h3 className="font-game text-lg text-primary">Focus Timer</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-primary/30">
              <DialogHeader>
                <DialogTitle className="font-game text-primary">Timer Settings</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Focus Time (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.focusTime}
                    onChange={(e) => setSettings({ ...settings, focusTime: parseInt(e.target.value) || 25 })}
                    className="bg-secondary/50"
                  />
                </div>
                <div>
                  <Label>Break Time (minutes)</Label>
                  <Input
                    type="number"
                    value={settings.breakTime}
                    onChange={(e) => setSettings({ ...settings, breakTime: parseInt(e.target.value) || 5 })}
                    className="bg-secondary/50"
                  />
                </div>
                <div>
                  <Label>Alarm Sound</Label>
                  <Select value={selectedSound} onValueChange={setSelectedSound}>
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {alarmSounds.map((sound) => (
                        <SelectItem key={sound.id} value={sound.id}>
                          {sound.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="outline"
                  onClick={() => {
                    const sound = alarmSounds.find(s => s.id === selectedSound);
                    if (sound) {
                      new Audio(sound.src).play().catch(console.error);
                    }
                  }}
                >
                  🔊 Test Sound
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === 'focus' ? 'default' : 'outline'}
          className={cn("flex-1", mode === 'focus' && "bg-primary")}
          onClick={() => switchMode('focus')}
        >
          🎯 Focus
        </Button>
        <Button
          variant={mode === 'break' ? 'default' : 'outline'}
          className={cn("flex-1", mode === 'break' && "bg-accent")}
          onClick={() => switchMode('break')}
        >
          ☕ Break
        </Button>
      </div>

      {/* Timer Display */}
      <div className="relative flex items-center justify-center mb-6">
        <svg className="w-48 h-48 -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-secondary"
          />
          <circle
            cx="96"
            cy="96"
            r="88"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={553}
            strokeDashoffset={553 - (553 * progress) / 100}
            className={cn(
              "transition-all duration-1000",
              mode === 'focus' ? 'text-primary' : 'text-accent'
            )}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute text-center">
          <div className={cn(
            "font-game text-5xl",
            mode === 'focus' ? 'text-primary' : 'text-accent',
            isRunning && 'animate-pulse'
          )}>
            {formatTime(timeLeft)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            {mode === 'focus' ? '🎯 Focus Time' : '☕ Break Time'}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={resetTimer}
          className="w-12 h-12"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
        <Button
          size="icon"
          onClick={toggleTimer}
          className={cn(
            "w-16 h-16 rounded-full",
            mode === 'focus' ? 'bg-primary glow-purple' : 'bg-accent'
          )}
        >
          {isRunning ? (
            <Pause className="w-8 h-8" />
          ) : (
            <Play className="w-8 h-8 ml-1" />
          )}
        </Button>
        <div className="w-12 h-12" /> {/* Spacer for alignment */}
      </div>
    </div>
  );
};
