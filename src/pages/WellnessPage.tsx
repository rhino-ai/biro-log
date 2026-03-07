import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGame } from '@/hooks/useGame';
import { cn } from '@/lib/utils';

const moods = [
  { emoji: '😔', label: 'Sad', value: 1 },
  { emoji: '😐', label: 'Meh', value: 2 },
  { emoji: '🙂', label: 'OK', value: 3 },
  { emoji: '😊', label: 'Good', value: 4 },
  { emoji: '🤩', label: 'Great', value: 5 },
];

const STORAGE_KEY = 'biro-wellness';

interface MoodEntry { date: string; mood: number; note: string; }
interface JournalEntry { id: string; date: string; mood: number; content: string; prompt: string; }

const breathPhases = ['Inhale', 'Hold', 'Exhale', 'Hold'] as const;

const quotes = [
  '"Success is not final, failure is not fatal: it is the courage to continue that counts." – Churchill',
  '"The only way to do great work is to love what you do." – Steve Jobs',
  '"Kuch bhi ho jaye, padhai band nahi honi chahiye." – Every topper ever',
  '"Your future self is watching you right now through memories."',
  '"IIT mein wo log bhi aate hain jo rote hue padhe the."',
  '"Discipline is choosing between what you want now and what you want most."',
];

const WellnessPage = () => {
  const { profile, streak, jungles, calculateJungleHealth } = useGame();
  const [data, setData] = useState<{ moods: MoodEntry[]; journal: JournalEntry[]; wallOfWhy: string }>({
    moods: [], journal: [], wallOfWhy: '',
  });
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalPrompt, setJournalPrompt] = useState('What challenged you today?');
  const [breathActive, setBreathActive] = useState(false);
  const [breathPhase, setBreathPhase] = useState(0);
  const [breathCount, setBreathCount] = useState(4);
  const [showSOS, setShowSOS] = useState(false);
  const [wallOfWhy, setWallOfWhy] = useState('');
  const breathTimer = useRef<any>(null);

  const today = new Date().toISOString().split('T')[0];
  const quote = quotes[Math.floor(Date.now() / 86400000) % quotes.length];

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      setData(parsed);
      setWallOfWhy(parsed.wallOfWhy || '');
      const todayEntry = parsed.moods.find((m: MoodEntry) => m.date === today);
      if (todayEntry) setTodayMood(todayEntry.mood);
    }
  }, [today]);

  const save = (d: typeof data) => { setData(d); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); };

  const saveMood = () => {
    if (!todayMood) return;
    const newMoods = [...data.moods.filter(m => m.date !== today), { date: today, mood: todayMood, note: moodNote }];
    save({ ...data, moods: newMoods });
    setMoodNote('');
  };

  const saveJournal = () => {
    if (!journalContent.trim()) return;
    const entry: JournalEntry = { id: crypto.randomUUID(), date: today, mood: todayMood || 3, content: journalContent, prompt: journalPrompt };
    save({ ...data, journal: [entry, ...data.journal] });
    setJournalContent('');
  };

  const saveWhy = () => { save({ ...data, wallOfWhy }); };

  // Breathing
  useEffect(() => {
    if (!breathActive) return;
    breathTimer.current = setInterval(() => {
      setBreathCount(c => {
        if (c <= 1) { setBreathPhase(p => (p + 1) % 4); return 4; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(breathTimer.current);
  }, [breathActive]);

  // SOS
  const totalHealth = jungles.reduce((acc, j) => acc + calculateJungleHealth(j.id), 0);
  const avgHealth = jungles.length > 0 ? Math.round(totalHealth / jungles.length) : 0;

  // Week mood data
  const weekMoods = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const key = d.toISOString().split('T')[0];
    const entry = data.moods.find(m => m.date === key);
    return { day: d.toLocaleDateString('en', { weekday: 'short' }), mood: entry?.mood || 0 };
  });

  if (showSOS) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 flex flex-col items-center justify-center p-8 animate-fade-in">
        <div className="space-y-8 text-center max-w-md">
          {breathActive ? (
            <>
              <div className={cn('w-32 h-32 rounded-full mx-auto flex items-center justify-center border-4 transition-all duration-1000',
                breathPhase === 0 && 'scale-125 border-accent bg-accent/10',
                breathPhase === 1 && 'scale-125 border-primary bg-primary/10',
                breathPhase === 2 && 'scale-75 border-blue-500 bg-blue-500/10',
                breathPhase === 3 && 'scale-75 border-muted bg-muted/10',
              )}>
                <div className="text-center">
                  <p className="font-game text-lg">{breathPhases[breathPhase]}</p>
                  <p className="font-game text-3xl text-primary">{breathCount}</p>
                </div>
              </div>
              <Button variant="outline" onClick={() => setBreathActive(false)}>Stop</Button>
            </>
          ) : (
            <>
              <p className="text-6xl">🫂</p>
              <h2 className="font-game text-xl text-primary">You've Got This</h2>
              <p className="text-sm text-muted-foreground">
                You've been on a {streak}-day streak. You know {avgHealth}% of your syllabus.
                Top rankers felt this too. Breathe. Trust your preparation.
              </p>
              <Button onClick={() => { setBreathActive(true); setBreathPhase(0); setBreathCount(4); }} className="bg-accent">
                Start Box Breathing (4-4-4-4)
              </Button>
              <p className="text-xs text-muted-foreground italic">"{quote}"</p>
              <Button variant="ghost" onClick={() => { setShowSOS(false); setBreathActive(false); }}>Close</Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">🧘 Wellness</h1>
          <Button variant="destructive" size="sm" onClick={() => setShowSOS(true)} className="font-game text-xs">
            🆘 SOS
          </Button>
        </div>

        {/* Daily Quote */}
        <div className="glass-panel rounded-2xl p-4 border border-accent/30 bg-gradient-to-r from-accent/5 to-primary/5">
          <p className="text-sm italic text-muted-foreground">{quote}</p>
        </div>

        <Tabs defaultValue="mood" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="mood" className="text-xs">Mood</TabsTrigger>
            <TabsTrigger value="breathe" className="text-xs">Breathe</TabsTrigger>
            <TabsTrigger value="journal" className="text-xs">Journal</TabsTrigger>
            <TabsTrigger value="why" className="text-xs">My Why</TabsTrigger>
          </TabsList>

          <TabsContent value="mood" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader><CardTitle className="text-sm font-game">How are you feeling today?</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between px-4">
                  {moods.map(m => (
                    <button key={m.value} onClick={() => setTodayMood(m.value)}
                      className={cn('text-3xl transition-transform', todayMood === m.value ? 'scale-125' : 'opacity-40 hover:opacity-70')}>
                      {m.emoji}
                    </button>
                  ))}
                </div>
                {todayMood && (
                  <>
                    <Input value={moodNote} onChange={e => setMoodNote(e.target.value)} placeholder="What's on your mind? (optional)" className="bg-secondary/50" />
                    <Button onClick={saveMood} className="w-full bg-primary">Save Mood</Button>
                  </>
                )}
              </CardContent>
            </Card>
            {/* Week heatmap */}
            <Card className="glass-panel border-primary/20">
              <CardHeader><CardTitle className="text-sm font-game">This Week</CardTitle></CardHeader>
              <CardContent>
                <div className="flex justify-between">
                  {weekMoods.map((d, i) => (
                    <div key={i} className="text-center space-y-1">
                      <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-sm',
                        d.mood === 0 && 'bg-muted/30',
                        d.mood === 1 && 'bg-raid/30',
                        d.mood === 2 && 'bg-coins/30',
                        d.mood === 3 && 'bg-blue-500/30',
                        d.mood === 4 && 'bg-accent/30',
                        d.mood === 5 && 'bg-accent/50 glow-green',
                      )}>
                        {d.mood > 0 ? moods[d.mood - 1].emoji : '·'}
                      </div>
                      <span className="text-[10px] text-muted-foreground">{d.day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breathe" className="space-y-4">
            <Card className="glass-panel border-accent/20">
              <CardHeader><CardTitle className="text-sm font-game">Box Breathing (4-4-4-4)</CardTitle></CardHeader>
              <CardContent className="flex flex-col items-center space-y-6">
                <div className={cn('w-40 h-40 rounded-full border-4 flex items-center justify-center transition-all duration-1000',
                  breathActive && breathPhase === 0 && 'scale-125 border-accent bg-accent/10',
                  breathActive && breathPhase === 1 && 'scale-125 border-primary bg-primary/10',
                  breathActive && breathPhase === 2 && 'scale-75 border-blue-500 bg-blue-500/10',
                  breathActive && breathPhase === 3 && 'scale-75 border-muted bg-muted/10',
                  !breathActive && 'border-border',
                )}>
                  {breathActive ? (
                    <div className="text-center">
                      <p className="font-game">{breathPhases[breathPhase]}</p>
                      <p className="font-game text-4xl text-primary">{breathCount}</p>
                    </div>
                  ) : (
                    <span className="text-4xl">🫁</span>
                  )}
                </div>
                <Button onClick={() => { setBreathActive(!breathActive); setBreathPhase(0); setBreathCount(4); }}
                  className={breathActive ? 'bg-raid' : 'bg-accent'}>
                  {breathActive ? 'Stop' : 'Start Breathing'}
                </Button>
              </CardContent>
            </Card>

            <Card className="glass-panel border-blue-500/20">
              <CardHeader><CardTitle className="text-sm font-game">5-4-3-2-1 Grounding</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>👁️ <strong>5</strong> things you can SEE</p>
                <p>✋ <strong>4</strong> things you can TOUCH</p>
                <p>👂 <strong>3</strong> things you can HEAR</p>
                <p>👃 <strong>2</strong> things you can SMELL</p>
                <p>👅 <strong>1</strong> thing you can TASTE</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="journal" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="text-sm font-game">Today's Entry</CardTitle>
                <div className="flex gap-2 flex-wrap mt-2">
                  {['What challenged you today?', 'What are you grateful for?', 'What will you do differently?'].map(p => (
                    <button key={p} onClick={() => setJournalPrompt(p)}
                      className={cn('text-[10px] px-2 py-1 rounded-full border', journalPrompt === p ? 'border-primary bg-primary/10 text-primary' : 'border-border')}>
                      {p}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground italic">Prompt: {journalPrompt}</p>
                <Textarea value={journalContent} onChange={e => setJournalContent(e.target.value)}
                  placeholder="Write your thoughts..." rows={4} className="bg-secondary/50" />
                <Button onClick={saveJournal} className="w-full bg-primary" disabled={!journalContent.trim()}>Save Entry</Button>
              </CardContent>
            </Card>
            {data.journal.slice(0, 5).map(entry => (
              <Card key={entry.id} className="glass-panel border-border">
                <CardContent className="pt-4 space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{entry.date}</span>
                    <span>{moods[entry.mood - 1]?.emoji || '🙂'}</span>
                  </div>
                  <p className="text-xs italic text-muted-foreground">{entry.prompt}</p>
                  <p className="text-sm">{entry.content}</p>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="why" className="space-y-4">
            <Card className="glass-panel border-accent/20">
              <CardHeader><CardTitle className="text-sm font-game">🔥 Wall of Why</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">Why are you studying? This will appear on your dashboard when you need motivation.</p>
                <Textarea value={wallOfWhy} onChange={e => setWallOfWhy(e.target.value)}
                  placeholder="I'm studying because..." rows={4} className="bg-secondary/50" />
                <Button onClick={saveWhy} className="w-full bg-accent">Save My Why</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default WellnessPage;
