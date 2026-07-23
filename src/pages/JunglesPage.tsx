import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import { useGameStore } from '@/store/gameStore';
import { getJunglesByTrack } from '@/data/syllabus';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { JungleCard } from '@/components/game/JungleCard';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { RotateCcw, Sparkles, X } from 'lucide-react';

const WALKTHROUGH_KEY = 'biro:jungles-walkthrough-v1';

const JunglesPage = () => {
  const navigate = useNavigate();
  const { jungles, calculateJungleHealth, studyTrack, setJungles } = useGame();
  const teacherSubjects = useGameStore((s) => s.teacherSubjects);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  // Auto-restore defaults if the current track's jungles were wiped from storage.
  useEffect(() => {
    if (jungles.length === 0) {
      const defaults = getJunglesByTrack(studyTrack);
      if (defaults.length > 0) {
        setJungles(JSON.parse(JSON.stringify(defaults)));
        toast({ title: '🌱 Chapters restored', description: 'Default subjects and chapters for your track are back.' });
      }
    }
    // run once per visit
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      if (!localStorage.getItem(WALKTHROUGH_KEY)) setShowWalkthrough(true);
    } catch {}
  }, []);

  const dismissWalkthrough = () => {
    try { localStorage.setItem(WALKTHROUGH_KEY, '1'); } catch {}
    setShowWalkthrough(false);
  };

  const restoreDefaults = () => {
    const defaults = getJunglesByTrack(studyTrack);
    if (defaults.length === 0) {
      toast({ title: 'No defaults for this track', description: 'This track builds its own subjects — use "Edit Chapters" inside a jungle to add them.' });
      return;
    }
    // Merge: keep any user-added jungles/chapters, restore missing ones.
    const merged = [...jungles];
    for (const def of defaults) {
      const existing = merged.find((j) => j.id === def.id);
      if (!existing) {
        merged.push(JSON.parse(JSON.stringify(def)));
      } else {
        const existingIds = new Set(existing.chapters.map((c) => c.id));
        const missing = def.chapters.filter((c) => !existingIds.has(c.id));
        if (missing.length) existing.chapters = [...existing.chapters, ...JSON.parse(JSON.stringify(missing))];
      }
    }
    setJungles(merged);
    toast({ title: '✅ Defaults restored', description: 'Missing subjects/chapters added back. Your progress was kept.' });
  };

  // Sort jungles by health
  const sortedJungles = useMemo(
    () => [...jungles].sort((a, b) => calculateJungleHealth(b.id) - calculateJungleHealth(a.id)),
    [jungles, calculateJungleHealth]
  );

  // Progress summary
  const summary = useMemo(() => {
    let totalChapters = 0, completed = 0, theory = 0, practice = 0, revision = 0;
    for (const j of jungles) {
      for (const c of j.chapters) {
        totalChapters++;
        if (c.theoryDone) theory++;
        if (c.practiceDone) practice++;
        if (c.revisionDone) revision++;
        if (c.theoryDone && c.practiceDone && c.revisionDone) completed++;
      }
    }
    const avgHealth = jungles.length
      ? Math.round(jungles.reduce((a, j) => a + calculateJungleHealth(j.id), 0) / jungles.length)
      : 0;
    return { totalChapters, completed, theory, practice, revision, avgHealth, jungleCount: jungles.length };
  }, [jungles, calculateJungleHealth]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <BackButton to="/" />
          <div className="text-center flex-1">
            <h1 className="font-game text-xl text-glow-green">
              🌴 Your Jungles
            </h1>
            <p className="text-muted-foreground text-xs">
              Tap a jungle to explore
            </p>
          </div>
          <div className="w-16" /> {/* Spacer for alignment */}
        </div>

        {/* Guided walkthrough */}
        {showWalkthrough && (
          <div className="glass-panel rounded-2xl p-4 border border-primary/40 animate-fade-in relative">
            <button
              onClick={dismissWalkthrough}
              className="absolute top-2 right-2 p-1 rounded-md hover:bg-white/10"
              aria-label="Dismiss walkthrough"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-start gap-3 pr-6">
              <Sparkles className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">Welcome to your Jungles 🌴</p>
                <ol className="text-xs text-muted-foreground list-decimal ml-4 space-y-1">
                  <li>Each jungle = a subject. Each tree = a chapter.</li>
                  <li>Tap a jungle → tick <b>Theory → Practice → Revision</b> to grow trees.</li>
                  <li>Use <b>Edit Chapters</b> inside a jungle to add your own.</li>
                  <li>Missing subjects? Hit <b>Restore defaults</b> below — progress is kept.</li>
                </ol>
                <Button size="sm" variant="secondary" onClick={dismissWalkthrough} className="mt-1">Got it</Button>
              </div>
            </div>
          </div>
        )}

        {/* Progress summary panel */}
        <div className="glass-panel rounded-2xl p-4 animate-fade-in border border-accent/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">📊 Progress Summary</h3>
            <span className="text-xs text-muted-foreground">Track: <b className="uppercase">{studyTrack}</b></span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="glass-panel rounded-lg py-2">
              <div className="text-lg font-game text-accent">{summary.avgHealth}%</div>
              <div className="text-[10px] text-muted-foreground">Avg Health</div>
            </div>
            <div className="glass-panel rounded-lg py-2">
              <div className="text-lg font-game text-primary">{summary.completed}/{summary.totalChapters}</div>
              <div className="text-[10px] text-muted-foreground">Mastered</div>
            </div>
            <div className="glass-panel rounded-lg py-2">
              <div className="text-lg font-game">{summary.jungleCount}</div>
              <div className="text-[10px] text-muted-foreground">Jungles</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2 text-center text-[11px]">
            <div className="rounded-md py-1 bg-yellow-500/10 text-yellow-300">📖 Theory {summary.theory}</div>
            <div className="rounded-md py-1 bg-green-500/10 text-green-300">✏️ Practice {summary.practice}</div>
            <div className="rounded-md py-1 bg-purple-500/10 text-purple-300">🔁 Revision {summary.revision}</div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={restoreDefaults} className="gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              Restore default chapters
            </Button>
            {teacherSubjects.length === 0 && (studyTrack === 'teacher' || studyTrack === 'other') && (
              <span className="text-[11px] text-muted-foreground self-center">
                This track is custom — add your own subjects.
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="glass-panel rounded-xl p-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-sm font-medium mb-3">🌳 Tree States</h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="space-y-1">
              <span className="text-2xl opacity-50">🪵</span>
              <p className="text-muted-foreground">Dry</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">🌱</span>
              <p className="text-muted-foreground">Growing</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">🌳</span>
              <p className="text-muted-foreground">Healthy</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">🌴</span>
              <p className="text-muted-foreground">Flourish</p>
            </div>
          </div>
        </div>

        {/* Jungle Cards */}
        {sortedJungles.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-center border border-dashed border-white/15 animate-fade-in">
            <p className="text-4xl mb-2">🌵</p>
            <p className="text-sm font-medium mb-1">No jungles yet</p>
            <p className="text-xs text-muted-foreground mb-3">
              Your subjects and chapters live here. Tap below to bring back the defaults for your track.
            </p>
            <Button size="sm" onClick={restoreDefaults} className="gap-2">
              <RotateCcw className="w-3.5 h-3.5" />
              Restore default chapters
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            {sortedJungles.map((jungle, index) => (
              <div
                key={jungle.id}
                className="animate-slide-up"
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                <JungleCard
                  jungle={jungle}
                  onClick={() => navigate(`/jungle/${jungle.id}`)}
                />
              </div>
            ))}
          </div>
        )}

        {/* Info Card */}
        <div className="glass-panel rounded-2xl p-4 border border-primary/20 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="font-medium text-sm mb-1">How to Grow</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>📖 Theory → Yellow leaves (+20 XP)</li>
                <li>✏️ Practice → Green leaves (+30 XP)</li>
                <li>🔁 Revision → Fruits & animals (+50 XP)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default JunglesPage;
