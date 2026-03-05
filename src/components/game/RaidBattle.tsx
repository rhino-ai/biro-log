import { useState, useEffect } from 'react';
import { useGame } from '@/hooks/useGame';
import { X, Swords, Trophy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface RaidBattleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RaidBattle = ({ isOpen, onClose }: RaidBattleProps) => {
  const { 
    getOverdueTasks, 
    toggleTask, 
    backlogCount, 
    addXP, 
    addCoins,
    addRaidRecord,
    jungles 
  } = useGame();
  
  const overdueTasks = getOverdueTasks();
  const [completedInRaid, setCompletedInRaid] = useState<string[]>([]);
  const [showVictory, setShowVictory] = useState(false);

  // Boss stats based on backlog
  const bossMaxHP = Math.max(100, backlogCount * 100);
  const currentHP = Math.max(0, bossMaxHP - (completedInRaid.length * 100));
  const hpPercentage = (currentHP / bossMaxHP) * 100;

  const victoryRewards = {
    coins: 40 + (backlogCount * 10),
    bonusXP: 500 + (backlogCount * 100),
  };

  // Check for victory
  useEffect(() => {
    if (completedInRaid.length > 0 && completedInRaid.length >= overdueTasks.length && !showVictory) {
      // All backlogs cleared!
      setShowVictory(true);
      addXP(victoryRewards.bonusXP);
      addCoins(victoryRewards.coins);
      
      // Record victory in raid history
      addRaidRecord({
        date: new Date().toISOString(),
        bossName: 'Backlog Monster',
        result: 'victory',
        tasksCleared: completedInRaid.length,
        xpGained: victoryRewards.bonusXP,
        coinsGained: victoryRewards.coins,
      });
      
      toast({
        title: '🏆 VICTORY!',
        description: `Boss defeated! +${victoryRewards.bonusXP} XP, +${victoryRewards.coins} coins!`,
      });
    }
  }, [completedInRaid, overdueTasks.length, showVictory, victoryRewards, addXP, addCoins, addRaidRecord]);

  const handleCompleteTask = (taskId: string) => {
    toggleTask(taskId);
    setCompletedInRaid((prev) => [...prev, taskId]);
    
    // Show damage effect
    toast({
      title: '💥 Critical Hit!',
      description: '-100 HP to Boss! Keep going!',
    });
  };

  const getJungleName = (jungleId: string) => {
    const jungle = jungles.find((j) => j.id === jungleId);
    return jungle ? `${jungle.icon} ${jungle.name}` : 'Unknown';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {/* Decorative Corners */}
      <div className="absolute top-4 left-4 w-24 h-24 border-l-2 border-t-2 border-destructive/50" />
      <div className="absolute top-4 right-4 w-24 h-24 border-r-2 border-t-2 border-destructive/50" />
      <div className="absolute bottom-4 left-4 w-24 h-24 border-l-2 border-b-2 border-destructive/50" />
      <div className="absolute bottom-4 right-4 w-24 h-24 border-r-2 border-b-2 border-destructive/50" />
      
      <div className="relative glass-panel border-destructive/30 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Swords className="w-8 h-8 text-destructive animate-pulse" />
          <h2 className="font-game text-3xl text-destructive text-glow-raid">RAID BATTLE</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute top-4 right-4"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Victory Screen */}
        {showVictory ? (
          <div className="text-center py-8 space-y-6">
            <div className="text-8xl animate-bounce">🏆</div>
            <h3 className="font-game text-3xl text-accent text-glow-green">VICTORY!</h3>
            <p className="text-muted-foreground">You defeated the Backlog Boss!</p>
            
            <div className="glass-panel rounded-xl p-4 inline-block">
              <h4 className="font-game text-sm text-coins mb-3">REWARDS</h4>
              <div className="flex gap-6">
                <div className="text-center">
                  <div className="text-3xl mb-1">⚡</div>
                  <div className="text-accent font-game text-xl">+{victoryRewards.bonusXP}</div>
                  <div className="text-xs text-muted-foreground">XP</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl mb-1">🪙</div>
                  <div className="text-coins font-game text-xl">+{victoryRewards.coins}</div>
                  <div className="text-xs text-muted-foreground">Coins</div>
                </div>
              </div>
            </div>

            <Button onClick={onClose} className="bg-accent hover:bg-accent/80 gap-2">
              <Trophy className="w-5 h-5" />
              Claim Rewards & Exit
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Boss Display */}
            <div className="text-center">
              <div className={cn(
                "text-7xl mb-3 transition-transform duration-200",
                completedInRaid.length > 0 && "animate-bounce-subtle opacity-80"
              )}>
                👹
              </div>
              <h3 className="font-game text-xl text-destructive mb-2">BACKLOG BOSS</h3>
              
              {/* HP Bar */}
              <div className="w-full max-w-md mx-auto space-y-1">
                <div className="h-5 bg-secondary rounded-full overflow-hidden border border-destructive/30">
                  <div 
                    className="h-full bg-gradient-to-r from-destructive to-destructive/70 transition-all duration-500 relative"
                    style={{ width: `${hpPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/20 to-transparent animate-shimmer" />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-destructive font-medium">{Math.round(hpPercentage)}%</span>
                  <span className="text-muted-foreground">HP: {Math.round(currentHP)} / {bossMaxHP}</span>
                </div>
              </div>
            </div>

            {/* Backlog Tasks to Complete */}
            <div className="space-y-3">
              <h4 className="font-game text-sm text-accent flex items-center gap-2">
                <Swords className="w-4 h-4" />
                DEFEAT BY COMPLETING TASKS ({overdueTasks.length - completedInRaid.length} remaining)
              </h4>
              
              {overdueTasks.length === 0 ? (
                <div className="glass-panel rounded-xl p-6 text-center">
                  <span className="text-4xl mb-2 block">🎉</span>
                  <p className="text-muted-foreground">No overdue tasks! The boss flees!</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[40vh] overflow-auto pr-2">
                  {overdueTasks.map((task) => {
                    const isCompleted = completedInRaid.includes(task.id);
                    
                    return (
                      <div
                        key={task.id}
                        className={cn(
                          "glass-panel rounded-xl p-3 border transition-all duration-300",
                          isCompleted 
                            ? "border-accent/50 bg-accent/10 opacity-60" 
                            : "border-destructive/30 hover:border-destructive/50"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                          ) : (
                            <Checkbox
                              checked={false}
                              onCheckedChange={() => handleCompleteTask(task.id)}
                              className="border-destructive data-[state=checked]:bg-accent"
                            />
                          )}
                          
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium",
                              isCompleted && "line-through text-muted-foreground"
                            )}>
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <span>{getJungleName(task.jungleId)}</span>
                              {task.dueDate && (
                                <span className="text-destructive">
                                  Due: {format(new Date(task.dueDate), 'MMM d')} {task.dueTime}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {!isCompleted && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompleteTask(task.id)}
                              className="border-accent/50 hover:bg-accent/20 gap-1"
                            >
                              ⚔️ Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Victory Rewards Preview */}
            <div className="glass-panel rounded-xl p-4 border border-coins/20">
              <h4 className="font-game text-sm text-coins text-center mb-3">VICTORY REWARDS</h4>
              <div className="flex justify-center gap-8">
                <div className="text-center">
                  <div className="text-2xl mb-1">⚡</div>
                  <div className="text-accent font-medium">{victoryRewards.bonusXP}</div>
                  <div className="text-xs text-muted-foreground">Bonus XP</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl mb-1">🪙</div>
                  <div className="text-coins font-medium">{victoryRewards.coins}</div>
                  <div className="text-xs text-muted-foreground">Coins</div>
                </div>
              </div>
            </div>

            {/* Hint */}
            <p className="text-xs text-center text-muted-foreground">
              💡 Complete all overdue tasks to defeat the boss and earn rewards!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
