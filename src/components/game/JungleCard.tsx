import { useGame } from '@/hooks/useGame';
import { JungleData } from '@/data/syllabus';
import { TreeIcon } from './TreeIcon';
import { cn } from '@/lib/utils';

interface JungleCardProps {
  jungle: JungleData;
  onClick: () => void;
}

export const JungleCard = ({ jungle, onClick }: JungleCardProps) => {
  const { calculateJungleHealth, getTreeState, jungles } = useGame();
  
  const currentJungle = jungles.find(j => j.id === jungle.id) || jungle;
  const health = calculateJungleHealth(jungle.id);
  
  const completedChapters = currentJungle.chapters.filter(
    (ch) => ch.theoryDone && ch.practiceDone && ch.revisionDone
  ).length;

  // Get dominant tree state
  const getJungleState = () => {
    if (health >= 80) return 'flourishing';
    if (health >= 50) return 'healthy';
    if (health >= 20) return 'growing';
    return 'dry';
  };

  const jungleState = getJungleState();

  return (
    <div
      onClick={onClick}
      className={cn(
        'jungle-card relative overflow-hidden',
        jungleState === 'dry' && 'opacity-80'
      )}
    >
      {/* Gradient Background */}
      <div className={cn(
        'absolute inset-0 opacity-20 bg-gradient-to-br',
        jungle.color
      )} />
      
      {/* Content */}
      <div className="relative p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{jungle.icon}</span>
              <h3 className="font-game text-lg font-bold">{jungle.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{jungle.description}</p>
          </div>
          <TreeIcon state={jungleState} size="lg" />
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Jungle Health</span>
            <span className="text-accent font-medium">{health}%</span>
          </div>
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent/70 to-accent rounded-full transition-all duration-700"
              style={{ width: `${health}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm">
          <div className="glass-panel px-3 py-1.5 rounded-lg">
            <span className="text-muted-foreground">Chapters: </span>
            <span className="text-foreground font-medium">
              {completedChapters}/{currentJungle.chapters.length}
            </span>
          </div>
          <div className="flex gap-1">
            {jungleState === 'flourishing' && (
              <>
                <span className="animate-bounce-subtle">🐒</span>
                <span className="animate-float">🦜</span>
              </>
            )}
            {jungleState === 'healthy' && <span>🦋</span>}
          </div>
        </div>
      </div>
    </div>
  );
};
