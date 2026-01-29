import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { JungleData, Chapter } from '@/data/syllabus';
import { Button } from '@/components/ui/button';
import { Star, BookOpen } from 'lucide-react';

interface ChaptersGridProps {
  jungle: JungleData;
  onSelectChapter?: (chapter: Chapter) => void;
}

type SubjectFilter = 'all' | 'mathematics' | 'physics' | 'chemistry';

const subjectTabs: { id: SubjectFilter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'mathematics', label: 'MATHS' },
  { id: 'physics', label: 'PHY' },
  { id: 'chemistry', label: 'P. CH' },
];

export const ChaptersGrid = ({ jungle, onSelectChapter }: ChaptersGridProps) => {
  const { getTreeState, jungles } = useGameStore();
  const [activeFilter, setActiveFilter] = useState<SubjectFilter>('all');

  // Get the current jungle from state
  const currentJungle = jungles.find(j => j.id === jungle.id) || jungle;

  // Filter chapters
  const filteredChapters = activeFilter === 'all' 
    ? currentJungle.chapters 
    : currentJungle.chapters.filter(ch => ch.subject === activeFilter);

  // Calculate star rating (1-5) based on progress
  const getStarRating = (chapter: Chapter): number => {
    let stars = 0;
    if (chapter.theoryDone) stars += 2;
    if (chapter.practiceDone) stars += 2;
    if (chapter.revisionDone) stars += 1;
    return stars;
  };

  return (
    <div className="glass-panel rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 p-4 border-b border-primary/20">
        <BookOpen className="w-6 h-6 text-primary" />
        <h2 className="font-game text-xl text-primary text-glow-purple">CHAPTERS LOG</h2>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex border-b border-primary/20">
        {subjectTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveFilter(tab.id)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors",
              activeFilter === tab.id 
                ? "text-primary-foreground bg-primary/80" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {tab.label}
          </button>
        ))}
        <button className="px-4 py-3 text-muted-foreground hover:text-foreground">
          +
        </button>
      </div>

      {/* Chapters Grid */}
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
        {filteredChapters.map((chapter, index) => {
          const state = getTreeState(chapter);
          const stars = getStarRating(chapter);
          
          return (
            <div
              key={chapter.id}
              className={cn(
                "glass-panel rounded-xl p-4 border transition-all cursor-pointer",
                "hover:border-primary/60 hover:scale-105",
                state === 'flourishing' && "border-accent/40",
                state === 'healthy' && "border-accent/20",
                state === 'growing' && "border-coins/20",
                state === 'dry' && "border-white/10"
              )}
              onClick={() => onSelectChapter?.(chapter)}
            >
              {/* Status Icon */}
              <div className="flex justify-end mb-2">
                <span className={cn(
                  "text-sm",
                  state === 'flourishing' && "text-accent",
                  state === 'healthy' && "text-accent/70",
                  state === 'growing' && "text-coins",
                  state === 'dry' && "text-muted-foreground"
                )}>
                  {state === 'flourishing' ? '✅' : state === 'healthy' ? '🌳' : state === 'growing' ? '🌱' : '📖'}
                </span>
              </div>

              {/* Chapter Name */}
              <h4 className="font-medium text-sm text-center mb-3 line-clamp-2">
                {index + 1}. {chapter.name}
              </h4>

              {/* Star Rating */}
              <div className="flex justify-center gap-0.5 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "w-4 h-4",
                      star <= stars ? "fill-coins text-coins" : "text-muted-foreground/30"
                    )}
                  />
                ))}
              </div>

              {/* View Button */}
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-primary/30 hover:bg-primary/20"
              >
                View
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
