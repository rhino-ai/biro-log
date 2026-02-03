import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChapterList } from '@/components/game/ChapterList';
import { JungleGardenMap } from '@/components/game/JungleGardenMap';
import { ProgressRadar } from '@/components/game/ProgressRadar';
import { ChaptersGrid } from '@/components/game/ChaptersGrid';
import { ChapterEditor } from '@/components/game/ChapterEditor';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ArrowLeft, Map, List, Grid3X3, TreeDeciduous, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subjectIcons } from '@/data/syllabus';

type Subject = 'all' | 'physics' | 'chemistry' | 'mathematics' | 'biology' | 'science' | 'english' | 'hindi' | 'social_science' | 'computer';

const JungleDetailPage = () => {
  const { jungleId } = useParams();
  const navigate = useNavigate();
  const { jungles, calculateJungleHealth } = useGameStore();
  const [activeSubject, setActiveSubject] = useState<Subject>('all');
  const [isEditorOpen, setIsEditorOpen] = useState(false);

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

  // Get unique subjects in this jungle
  const uniqueSubjects = [...new Set(jungle.chapters.map((ch) => ch.subject))];
  const subjectFilters = [
    { key: 'all' as Subject, label: 'All', icon: '📚' },
    ...uniqueSubjects.map((subject) => ({
      key: subject as Subject,
      label: subject.charAt(0).toUpperCase() + subject.slice(1).replace('_', ' '),
      icon: subjectIcons[subject] || '📚',
    })),
  ];

  // Count by subject
  const subjectCounts = uniqueSubjects.reduce((acc, subject) => {
    acc[subject] = jungle.chapters.filter((ch) => ch.subject === subject).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Back Button & Edit */}
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} />
            Back
          </Button>

          <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit2 className="w-4 h-4" />
                Edit Chapters
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-primary/30 max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-game flex items-center gap-2">
                  {jungle.icon} Edit {jungle.name} Chapters
                </DialogTitle>
              </DialogHeader>
              <ChapterEditor jungleId={jungle.id} />
            </DialogContent>
          </Dialog>
        </div>

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
                <span className="text-muted-foreground">Chapters: </span>
                <span className="text-accent font-medium">{completedChapters}/{jungle.chapters.length}</span>
              </div>
              <div className="glass-panel px-3 py-2 rounded-lg">
                <span className="text-muted-foreground">Trees: </span>
                <span className="text-accent font-medium">🌳 {jungle.chapters.length}</span>
              </div>
              <div className="flex items-center gap-1">
                {health >= 70 && <span className="animate-float">🦜</span>}
                {health >= 50 && <span className="animate-bounce-subtle">🐒</span>}
                {health < 30 && <span className="opacity-50">🍂</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Radar */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <ProgressRadar jungleId={jungle.id} />
        </div>

        {/* View Mode Tabs */}
        <Tabs defaultValue="garden" className="space-y-4">
          <TabsList className="glass-panel w-full grid grid-cols-4">
            <TabsTrigger value="garden" className="gap-1">
              <TreeDeciduous className="w-4 h-4" />
              <span className="hidden sm:inline">Garden</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </TabsTrigger>
            <TabsTrigger value="map" className="gap-1">
              <Map className="w-4 h-4" />
              <span className="hidden sm:inline">Map</span>
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-1">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </TabsTrigger>
          </TabsList>

          {/* Gardens View - Subject-based with chapter trees */}
          <TabsContent value="garden">
            <JungleGardenMap jungle={jungle} />
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            {/* Subject Filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
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
                  {filter.key !== 'all' && subjectCounts[filter.key] && (
                    <span className="text-xs opacity-70">({subjectCounts[filter.key]})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Chapters List */}
            <ChapterList jungle={jungle} filterSubject={activeSubject} />
          </TabsContent>

          <TabsContent value="map">
            <JungleGardenMap jungle={jungle} />
          </TabsContent>

          <TabsContent value="grid">
            <ChaptersGrid jungle={jungle} />
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
};

export default JungleDetailPage;
