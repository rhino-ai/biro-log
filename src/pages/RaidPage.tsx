import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { RaidBattle } from '@/components/game/RaidBattle';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Swords, Shield, Zap, Trophy, Flame, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const RaidPage = () => {
  const { backlogCount, xp, coins, streak, level, raidHistory, getOverdueTasks } = useGameStore();
  const [showBattle, setShowBattle] = useState(false);
  
  const overdueTasks = getOverdueTasks();

  // Boss stats based on backlog
  const bossMaxHP = Math.max(100, backlogCount * 100);
  const currentHP = bossMaxHP; // Full HP until battle starts
  const hpPercentage = 100;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Raid Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Swords className="w-8 h-8 text-destructive animate-pulse" />
            <h1 className="font-game text-2xl text-destructive">RAID ARENA</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Complete overdue tasks to defeat the Backlog Boss!
          </p>
        </div>

        {/* Current Raid Status */}
        <Card className="glass-panel border-destructive/30 overflow-hidden relative">
          {/* Decorative Border */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-0 w-16 h-16 border-l-2 border-t-2 border-destructive/40" />
            <div className="absolute top-0 right-0 w-16 h-16 border-r-2 border-t-2 border-destructive/40" />
            <div className="absolute bottom-0 left-0 w-16 h-16 border-l-2 border-b-2 border-destructive/40" />
            <div className="absolute bottom-0 right-0 w-16 h-16 border-r-2 border-b-2 border-destructive/40" />
          </div>

          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-game text-lg text-destructive">BACKLOG BOSS</h3>
              {backlogCount > 0 && (
                <span className="px-2 py-1 bg-destructive/20 text-destructive text-xs rounded-full animate-pulse">
                  {backlogCount} TASKS OVERDUE
                </span>
              )}
            </div>

            {/* Boss Display */}
            <div className="text-center mb-6">
              <div className={cn(
                "text-7xl mb-3",
                backlogCount > 0 ? "animate-bounce-subtle" : "opacity-50"
              )}>
                👹
              </div>
              <h2 className="font-game text-xl text-destructive mb-1">
                {backlogCount > 0 ? 'BACKLOG MONSTER' : 'NO BOSS ACTIVE'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {backlogCount > 0 
                  ? `${overdueTasks.length} overdue tasks to clear` 
                  : 'Complete tasks on time to avoid raids!'}
              </p>
            </div>

            {/* HP Bar */}
            {backlogCount > 0 && (
              <div className="space-y-2 mb-6">
                <div className="h-6 bg-secondary rounded-full overflow-hidden border border-destructive/30">
                  <div 
                    className="h-full bg-gradient-to-r from-destructive via-red-500 to-red-400 transition-all duration-500 relative"
                    style={{ width: `${hpPercentage}%` }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-destructive font-medium">{Math.round(hpPercentage)}%</span>
                  <span className="text-muted-foreground">HP: {currentHP} / {bossMaxHP}</span>
                </div>
              </div>
            )}

            {/* Battle Button */}
            <Button 
              onClick={() => setShowBattle(true)}
              className={cn(
                "w-full font-game gap-2",
                backlogCount > 0 
                  ? "bg-destructive hover:bg-destructive/90 text-white"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              size="lg"
              disabled={backlogCount === 0}
            >
              <Swords className="w-5 h-5" />
              {backlogCount > 0 ? 'ENTER BATTLE' : 'NO BACKLOGS'}
            </Button>
          </CardContent>
        </Card>

        {/* Player Stats */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="glass-panel border-primary/20">
            <CardContent className="p-3 text-center">
              <Shield className="w-5 h-5 mx-auto mb-1 text-primary" />
              <div className="font-game text-lg text-primary">{level}</div>
              <div className="text-xs text-muted-foreground">Level</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-accent/20">
            <CardContent className="p-3 text-center">
              <Zap className="w-5 h-5 mx-auto mb-1 text-accent" />
              <div className="font-game text-lg text-accent">{xp}</div>
              <div className="text-xs text-muted-foreground">XP</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-coins/20">
            <CardContent className="p-3 text-center">
              <Trophy className="w-5 h-5 mx-auto mb-1 text-coins" />
              <div className="font-game text-lg text-coins">{coins}</div>
              <div className="text-xs text-muted-foreground">Coins</div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-streak/20">
            <CardContent className="p-3 text-center">
              <Flame className={cn("w-5 h-5 mx-auto mb-1", streak >= 3 && "text-streak animate-fire")} />
              <div className="font-game text-lg text-streak">{streak}</div>
              <div className="text-xs text-muted-foreground">Streak</div>
            </CardContent>
          </Card>
        </div>

        {/* Victory Rewards Preview */}
        <Card className="glass-panel border-coins/20">
          <CardContent className="p-4">
            <h3 className="font-game text-sm text-coins mb-3 text-center">VICTORY REWARDS</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl mb-1">🪙</div>
                <div className="text-coins font-medium">{40 + (backlogCount * 10)}+</div>
                <div className="text-xs text-muted-foreground">Coins</div>
              </div>
              <div>
                <div className="text-2xl mb-1">⚡</div>
                <div className="text-accent font-medium">{500 + (backlogCount * 100)}</div>
                <div className="text-xs text-muted-foreground">Bonus XP</div>
              </div>
              <div>
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-primary font-medium">Glory</div>
                <div className="text-xs text-muted-foreground">Victory</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Raid History */}
        <div className="space-y-3">
          <h3 className="font-game text-lg flex items-center gap-2">
            <Trophy className="w-5 h-5 text-coins" />
            Raid History
          </h3>
          
          {raidHistory.length === 0 ? (
            <Card className="glass-panel border-muted/20">
              <CardContent className="p-6 text-center">
                <span className="text-4xl mb-2 block">🗡️</span>
                <p className="text-muted-foreground text-sm">No raid battles yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Complete backlogs to record victories!
                </p>
              </CardContent>
            </Card>
          ) : (
            raidHistory.slice(0, 5).map((raid) => (
              <Card key={raid.id} className={cn(
                "glass-panel",
                raid.result === 'victory' ? "border-accent/20" : "border-destructive/20"
              )}>
                <CardContent className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-xl",
                      raid.result === 'victory' ? "bg-accent/20" : "bg-destructive/20"
                    )}>
                      {raid.result === 'victory' ? '🏆' : '💀'}
                    </div>
                    <div>
                      <div className="font-medium">{raid.bossName}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(raid.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn(
                      "font-game text-sm",
                      raid.result === 'victory' ? "text-accent" : "text-destructive"
                    )}>
                      {raid.result.toUpperCase()}
                    </div>
                    {raid.xpGained && (
                      <div className="text-xs text-muted-foreground">+{raid.xpGained} XP</div>
                    )}
                    {raid.tasksCleared > 0 && (
                      <div className="text-xs text-accent">{raid.tasksCleared} tasks cleared</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* How Raid Works */}
        <Card className="glass-panel border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div>
                <h4 className="font-medium text-sm mb-1">How Raid Works</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Overdue tasks become Backlog Boss HP</li>
                  <li>• Complete each task = Deal 100 damage</li>
                  <li>• Clear all backlogs = Victory + Rewards!</li>
                  <li>• Stay consistent to avoid raids!</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNav />

      {/* Battle Modal */}
      <RaidBattle isOpen={showBattle} onClose={() => setShowBattle(false)} />
    </div>
  );
};

export default RaidPage;
