import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGame } from '@/hooks/useGame';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { ChapterList } from '@/components/game/ChapterList';
import { JungleGardenMap } from '@/components/game/JungleGardenMap';
import { ChaptersGrid } from '@/components/game/ChaptersGrid';
import { ChapterEditor } from '@/components/game/ChapterEditor';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { List, Grid3X3, TreeDeciduous, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subjectIcons } from '@/data/syllabus';

type Subject = 'all' | 'physics' | 'chemistry' | 'mathematics' | 'biology' | 'science' | 'english' | 'hindi' | 'social_science' | 'computer';

const JungleDetailPage = () => {
  const { jungleId } = useParams();
  const navigate = useNavigate();
  const { jungles, calculateJungleHealth } = useGame();
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

  const uniqueSubjects = [...new Set(jungle.chapters.map((ch) => ch.subject))];
  const subjectFilters = [
    { key: 'all' as Subject, label: 'All', icon: '📚' },
    ...uniqueSubjects.map((subject) => ({
      key: subject as Subject,
      label: subject.charAt(0).toUpperCase() + subject.slice(1).replace('_', ' '),
      icon: subjectIcons[subject] || '📚',
    })),
  ];

  const subjectCounts = uniqueSubjects.reduce((acc, subject) => {
    acc[subject] = jungle.chapters.filter((ch) => ch.subject === subject).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/jungles" />
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
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Jungle Health</span>
                <span className="text-accent font-game">{health}%</span>
              </div>
              <div className="h-3 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full transition-all duration-700" style={{ width: `${health}%` }} />
              </div>
            </div>
            <div className="flex gap-4 text-sm">
              <div className="glass-panel px-3 py-2 rounded-lg">
                <span className="text-muted-foreground">Chapters: </span>
                <span className="text-accent font-medium">{completedChapters}/{jungle.chapters.length}</span>
              </div>
              <div className="glass-panel px-3 py-2 rounded-lg">
                <span className="text-muted-foreground">Trees: </span>
                <span className="text-accent font-medium">🌳 {jungle.chapters.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Tabs - REMOVED duplicate map tab */}
        <Tabs defaultValue="garden" className="space-y-4">
          <TabsList className="glass-panel w-full grid grid-cols-3">
            <TabsTrigger value="garden" className="gap-1">
              <TreeDeciduous className="w-4 h-4" />
              <span className="hidden sm:inline">Garden</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-1">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">List</span>
            </TabsTrigger>
            <TabsTrigger value="grid" className="gap-1">
              <Grid3X3 className="w-4 h-4" />
              <span className="hidden sm:inline">Grid</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="garden">
            <JungleGardenMap jungle={jungle} />
          </TabsContent>

          <TabsContent value="list" className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {subjectFilters.map((filter) => (
                <button key={filter.key} onClick={() => setActiveSubject(filter.key)}
                  className={cn('flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all duration-300',
                    activeSubject === filter.key ? 'glass-panel glow-purple text-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                  )}>
                  <span>{filter.icon}</span>
                  <span className="text-sm">{filter.label}</span>
                  {filter.key !== 'all' && subjectCounts[filter.key] && (
                    <span className="text-xs opacity-70">({subjectCounts[filter.key]})</span>
                  )}
                </button>
              ))}
            </div>
            <ChapterList jungle={jungle} filterSubject={activeSubject} />
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
