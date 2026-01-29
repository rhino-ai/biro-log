import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { X, Swords, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BattleLogEntry {
  id: string;
  time: string;
  message: string;
  damage: number;
}

interface RaidBattleProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RaidBattle = ({ isOpen, onClose }: RaidBattleProps) => {
  const { backlogCount, xp, coins, addXP, addCoins } = useGameStore();
  
  // Boss stats based on backlog
  const bossMaxHP = 5000;
  const currentHP = Math.max(0, bossMaxHP - (xp * 0.5));
  const hpPercentage = (currentHP / bossMaxHP) * 100;
  
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([
    { id: '1', time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), message: "Raid Boss 'Lecture Backlog' appeared!", damage: 0 },
  ]);

  const [isAttacking, setIsAttacking] = useState(false);

  const victoryRewards = {
    coins: 40 + (backlogCount * 5),
    bonusXP: 1000,
    special: '3 Hours Coding',
  };

  const handleAttack = (attackType: 'theory' | 'practice' | 'revision') => {
    setIsAttacking(true);
    const damages = { theory: 100, practice: 150, revision: 200 };
    const damage = damages[attackType];
    const xpGain = damage / 10;
    
    const newEntry: BattleLogEntry = {
      id: Date.now().toString(),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      message: `Attacked via '${attackType.charAt(0).toUpperCase() + attackType.slice(1)}' for ${damage} damage.`,
      damage,
    };
    
    setBattleLog(prev => [newEntry, ...prev].slice(0, 10));
    addXP(xpGain);
    
    setTimeout(() => setIsAttacking(false), 500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      {/* Decorative Corners */}
      <div className="absolute top-4 left-4 w-24 h-24 border-l-2 border-t-2 border-destructive/50" />
      <div className="absolute top-4 right-4 w-24 h-24 border-r-2 border-t-2 border-destructive/50" />
      <div className="absolute bottom-4 left-4 w-24 h-24 border-l-2 border-b-2 border-destructive/50" />
      <div className="absolute bottom-4 right-4 w-24 h-24 border-r-2 border-b-2 border-destructive/50" />
      
      <div className="relative glass-panel border-destructive/30 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <Swords className="w-8 h-8 text-destructive animate-pulse" />
          <h2 className="font-game text-3xl text-destructive text-glow-raid">RAID</h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="absolute top-4 right-4"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Battle Log */}
          <div className="glass-panel rounded-lg p-4 border border-primary/20">
            <h3 className="font-game text-sm mb-3 text-primary">BATTLE LOG</h3>
            <div className="space-y-3 max-h-60 overflow-auto">
              {battleLog.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs">
                  <span className="text-muted-foreground whitespace-nowrap">{entry.time}</span>
                  <span className="text-accent">💥</span>
                  <span className="text-foreground">{entry.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Boss Display */}
          <div className="flex flex-col items-center justify-center">
            {/* Boss Visual */}
            <div className={cn(
              "text-8xl mb-4 transition-transform duration-200",
              isAttacking && "scale-95 opacity-80"
            )}>
              👹
            </div>

            {/* Boss Name & HP */}
            <h3 className="font-game text-lg text-destructive mb-2">LECTURE BACKLOG</h3>
            <div className="w-full space-y-1">
              <div className="h-4 bg-secondary rounded-full overflow-hidden border border-destructive/30">
                <div 
                  className="h-full bg-gradient-to-r from-destructive to-red-400 transition-all duration-500"
                  style={{ width: `${hpPercentage}%` }}
                />
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-destructive">{Math.round(hpPercentage)}%</span>
                <span className="text-muted-foreground">HP: {Math.round(currentHP)} / {bossMaxHP}</span>
              </div>
              <p className="text-xs text-destructive text-center">EXP Stolen: {backlogCount * 50}</p>
            </div>

            {/* Attack Buttons */}
            <div className="flex gap-2 mt-4">
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleAttack('theory')}
                className="border-primary/50 hover:bg-primary/20"
              >
                📖 Theory
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleAttack('practice')}
                className="border-accent/50 hover:bg-accent/20"
              >
                ✏️ Practice
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleAttack('revision')}
                className="border-coins/50 hover:bg-coins/20"
              >
                🔄 Revision
              </Button>
            </div>
          </div>

          {/* Victory Rewards */}
          <div className="glass-panel rounded-lg p-4 border border-coins/20">
            <h3 className="font-game text-sm mb-3 text-coins text-center">VICTORY REWARDS</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Coins:</span>
                <span className="text-coins font-medium">{victoryRewards.coins} 🪙</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Bonus EXP:</span>
                <span className="text-accent font-medium">{victoryRewards.bonusXP}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Special:</span>
                <span className="text-primary italic">{victoryRewards.special}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mt-6">
          <Button variant="outline" size="sm" className="border-primary/50">
            ⬅️
          </Button>
        </div>
      </div>
    </div>
  );
};
