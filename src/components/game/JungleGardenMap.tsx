import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { JungleData, Chapter } from '@/data/syllabus';
import { TreeIcon } from './TreeIcon';

interface JungleGardenMapProps {
  jungle: JungleData;
  className?: string;
}

const subjectConfig = {
  physics: { 
    name: 'Physics Garden', 
    icon: '⚡', 
    color: 'from-blue-500/20 to-cyan-500/20',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10'
  },
  chemistry: { 
    name: 'Chemistry Garden', 
    icon: '🧪', 
    color: 'from-green-500/20 to-emerald-500/20',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10'
  },
  mathematics: { 
    name: 'Mathematics Garden', 
    icon: '📐', 
    color: 'from-yellow-500/20 to-orange-500/20',
    borderColor: 'border-yellow-500/30',
    bgColor: 'bg-yellow-500/10'
  },
};

export const JungleGardenMap = ({ jungle, className }: JungleGardenMapProps) => {
  const { getTreeState, updateChapterProgress } = useGameStore();

  // Group chapters by subject
  const chaptersBySubject = jungle.chapters.reduce((acc, chapter) => {
    if (!acc[chapter.subject]) {
      acc[chapter.subject] = [];
    }
    acc[chapter.subject].push(chapter);
    return acc;
  }, {} as Record<string, Chapter[]>);

  const handleTreeClick = (chapter: Chapter) => {
    const state = getTreeState(chapter);
    // Cycle through states
    if (!chapter.theoryDone) {
      updateChapterProgress(jungle.id, chapter.id, 'theoryDone', true);
    } else if (!chapter.practiceDone) {
      updateChapterProgress(jungle.id, chapter.id, 'practiceDone', true);
    } else if (!chapter.revisionDone) {
      updateChapterProgress(jungle.id, chapter.id, 'revisionDone', true);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {Object.entries(chaptersBySubject).map(([subject, chapters]) => {
        const config = subjectConfig[subject as keyof typeof subjectConfig];
        const completedCount = chapters.filter(c => c.theoryDone && c.practiceDone && c.revisionDone).length;
        const gardenHealth = Math.round((completedCount / chapters.length) * 100);
        
        return (
          <div 
            key={subject}
            className={cn(
              "glass-panel rounded-2xl overflow-hidden border",
              config.borderColor
            )}
          >
            {/* Garden Header */}
            <div className={cn(
              "p-4 border-b flex items-center justify-between",
              config.borderColor,
              `bg-gradient-to-r ${config.color}`
            )}>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{config.icon}</span>
                <div>
                  <h3 className="font-game text-lg">{config.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {completedCount}/{chapters.length} trees flourishing
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-game text-2xl text-accent">{gardenHealth}%</span>
                <div className="flex gap-1 mt-1">
                  {gardenHealth >= 70 && <span className="text-sm animate-float">🦜</span>}
                  {gardenHealth >= 50 && <span className="text-sm animate-bounce-subtle">🐿️</span>}
                  {gardenHealth >= 30 && <span className="text-sm">🦋</span>}
                </div>
              </div>
            </div>

            {/* Trees Grid */}
            <div className="p-4">
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
                {chapters.map((chapter, index) => {
                  const treeState = getTreeState(chapter);
                  const chapterNum = index + 1;
                  
                  return (
                    <button
                      key={chapter.id}
                      onClick={() => handleTreeClick(chapter)}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2 rounded-xl transition-all",
                        "hover:scale-110 hover:bg-white/5",
                        treeState === 'flourishing' && "bg-accent/10 ring-1 ring-accent/30"
                      )}
                      title={`${chapter.name}\n${treeState.toUpperCase()}`}
                    >
                      <TreeIcon state={treeState} size="sm" />
                      <span className="text-[10px] text-muted-foreground text-center line-clamp-2">
                        Ch-{chapterNum}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Garden Path (decorative) */}
            <div className={cn("px-4 pb-4", config.bgColor)}>
              <div className="h-2 rounded-full bg-gradient-to-r from-amber-800/30 via-amber-600/20 to-amber-800/30" />
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="glass-panel rounded-xl p-4 border border-white/10">
        <h4 className="text-xs text-muted-foreground mb-2">🌱 Tree Legend (tap to progress):</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <TreeIcon state="dry" size="sm" />
            <span className="text-muted-foreground">Not Started</span>
          </div>
          <div className="flex items-center gap-2">
            <TreeIcon state="growing" size="sm" />
            <span className="text-muted-foreground">Theory ✓</span>
          </div>
          <div className="flex items-center gap-2">
            <TreeIcon state="healthy" size="sm" />
            <span className="text-muted-foreground">+Practice ✓</span>
          </div>
          <div className="flex items-center gap-2">
            <TreeIcon state="flourishing" size="sm" />
            <span className="text-muted-foreground">+Revision ✓</span>
          </div>
        </div>
      </div>
    </div>
  );
};
