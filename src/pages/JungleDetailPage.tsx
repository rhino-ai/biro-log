import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChapterList } from '@/components/game/ChapterList';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Subject = 'all' | 'physics' | 'chemistry' | 'mathematics';

const subjectFilters: { key: Subject; label: string; icon: string }[] = [
  { key: 'all', label: 'All', icon: '📚' },
  { key: 'physics', label: 'Physics', icon: '⚛️' },
  { key: 'chemistry', label: 'Chemistry', icon: '🧪' },
  { key: 'mathematics', label: 'Maths', icon: '📐' },
];

const JungleDetailPage = () => {
  const { jungleId } = useParams();
  const navigate = useNavigate();
  const { jungles, calculateJungleHealth } = useGameStore();
  const [activeSubject, setActiveSubject] = useState<Subject>('all');

  const jungle = jungles.find((j) => j.id === jungleId);

  if (!jungle) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Jungle not found</p>
      </div>
    );
  }

  const health = calculateJungleHealth(jungle.id);
  const completedChapters = jungle.chapters.filter(
    (ch) => ch.theoryDone && ch.practiceDone && ch.revisionDone
  ).length;

  // Count by subject
  const subjectCounts = {
    physics: jungle.chapters.filter((ch) => ch.subject === 'physics').length,
    chemistry: jungle.chapters.filter((ch) => ch.subject === 'chemistry').length,
    mathematics: jungle.chapters.filter((ch) => ch.subject === 'mathematics').length,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} />
          Back
        </Button>

        {/* Jungle Header */}
        <div className={cn('glass-panel rounded-2xl p-5 animate-fade-in relative overflow-hidden')}>
          <div className={cn('absolute inset-0 opacity-10 bg-gradient-to-br', jungle.color)} />
          
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">{jungle.icon}</span>
              <div>
                <h1 className="font-game text-xl">{jungle.name}</h1>
                <p className="text-sm text-muted-foreground">{jungle.description}</p>
              </div>
            </div>

            {/* Health Bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jungle Health</span>
                <span className="text-accent font-game">{health}%</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full transition-all duration-700"
                  style={{ width: `${health}%` }}
                />
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-4 text-sm">
              <div className="glass-panel px-3 py-2 rounded-lg">
                <span className="text-muted-foreground">Completed: </span>
                <span className="text-accent font-medium">{completedChapters}/{jungle.chapters.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {health >= 70 && <span className="animate-float">🦜</span>}
                {health >= 50 && <span className="animate-bounce-subtle">🐒</span>}
                {health < 30 && <span className="opacity-50">🍂</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Subject Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {subjectFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setActiveSubject(filter.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300',
                activeSubject === filter.key
                  ? 'glass-panel glow-purple text-foreground'
                  : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
              )}
            >
              <span>{filter.icon}</span>
              <span className="text-sm">{filter.label}</span>
              {filter.key !== 'all' && (
                <span className="text-xs opacity-70">({subjectCounts[filter.key]})</span>
              )}
            </button>
          ))}
        </div>

        {/* Chapters */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <ChapterList jungle={jungle} filterSubject={activeSubject} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default JungleDetailPage;
