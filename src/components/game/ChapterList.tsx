import { Chapter, JungleData } from '@/data/syllabus';
import { useGameStore } from '@/store/gameStore';
import { TreeIcon } from './TreeIcon';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface ChapterListProps {
  jungle: JungleData;
  filterSubject?: 'physics' | 'chemistry' | 'mathematics' | 'all';
}

const subjectColors = {
  physics: 'border-l-blue-500',
  chemistry: 'border-l-green-500',
  mathematics: 'border-l-purple-500',
};

const subjectIcons = {
  physics: '⚛️',
  chemistry: '🧪',
  mathematics: '📐',
};

export const ChapterList = ({ jungle, filterSubject = 'all' }: ChapterListProps) => {
  const { jungles, updateChapterProgress, getTreeState } = useGameStore();
  
  const currentJungle = jungles.find(j => j.id === jungle.id) || jungle;
  
  const filteredChapters = currentJungle.chapters.filter(
    (ch) => filterSubject === 'all' || ch.subject === filterSubject
  );

  const handleToggle = (chapterId: string, field: 'theoryDone' | 'practiceDone' | 'revisionDone', currentValue: boolean) => {
    updateChapterProgress(jungle.id, chapterId, field, !currentValue);
  };

  return (
    <div className="space-y-3">
      {filteredChapters.map((chapter) => {
        const treeState = getTreeState(chapter);
        return (
          <div
            key={chapter.id}
            className={cn(
              'glass-panel rounded-xl p-4 border-l-4 transition-all duration-300',
              subjectColors[chapter.subject]
            )}
          >
            <div className="flex items-start gap-3">
              <TreeIcon state={treeState} size="sm" />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span>{subjectIcons[chapter.subject]}</span>
                  <h4 className="font-medium text-sm truncate">{chapter.name}</h4>
                </div>
                
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <Checkbox
                      checked={chapter.theoryDone}
                      onCheckedChange={() => handleToggle(chapter.id, 'theoryDone', chapter.theoryDone)}
                      className="border-yellow-500 data-[state=checked]:bg-yellow-500 data-[state=checked]:border-yellow-500"
                    />
                    <span className={cn(
                      'text-xs transition-colors',
                      chapter.theoryDone ? 'text-yellow-400' : 'text-muted-foreground group-hover:text-yellow-400'
                    )}>
                      Theory
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <Checkbox
                      checked={chapter.practiceDone}
                      onCheckedChange={() => handleToggle(chapter.id, 'practiceDone', chapter.practiceDone)}
                      className="border-accent data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                    />
                    <span className={cn(
                      'text-xs transition-colors',
                      chapter.practiceDone ? 'text-accent' : 'text-muted-foreground group-hover:text-accent'
                    )}>
                      Practice
                    </span>
                  </label>
                  
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <Checkbox
                      checked={chapter.revisionDone}
                      onCheckedChange={() => handleToggle(chapter.id, 'revisionDone', chapter.revisionDone)}
                      className="border-primary data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                    <span className={cn(
                      'text-xs transition-colors',
                      chapter.revisionDone ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                    )}>
                      Revision
                    </span>
                  </label>
                </div>
              </div>
              
              <div className="text-xs text-coins font-medium">
                +{chapter.xpReward} XP
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
