import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Target, Plus, Flame, Info, Settings } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Quest {
  id: string;
  title: string;
  xp: number;
  coins: number;
  type: 'daily' | 'weekly' | 'custom';
  category?: string;
  dueDate?: string;
  streakDays?: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  completed: boolean;
}

const mockQuests: Quest[] = [
  { id: '1', title: 'Daily Practice', xp: 0, coins: 0, type: 'daily', difficulty: 'Medium', completed: false },
  { id: '2', title: 'Daily Revision', xp: 100, coins: 5, type: 'daily', difficulty: 'Medium', streakDays: 4, completed: false },
  { id: '3', title: 'Chemical Kinetics: Lecture 1', xp: 100, coins: 0, type: 'custom', category: 'P. Chem', dueDate: '2025-05-21', difficulty: 'Medium', completed: false },
  { id: '4', title: 'Chemical Kinetics: Lecture 10', xp: 100, coins: 0, type: 'custom', category: 'P. Chem', dueDate: '2025-05-24', difficulty: 'Medium', completed: false },
];

export const QuestPanel = () => {
  const { tasks, toggleTask } = useGameStore();
  const [activeTab, setActiveTab] = useState<'today' | 'week' | 'active'>('active');

  const filteredQuests = mockQuests; // In real app, filter based on tab

  return (
    <div className="glass-panel rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 p-4 border-b border-primary/20">
        <Target className="w-6 h-6 text-primary" />
        <h2 className="font-game text-xl text-primary text-glow-purple">QUESTS</h2>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-primary/20">
        {['today', 'week', 'active'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors uppercase",
              activeTab === tab 
                ? "text-primary-foreground bg-primary/80" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {tab}
          </button>
        ))}
        <button className="px-4 py-3 text-muted-foreground hover:text-foreground">
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Quest List */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {filteredQuests.map((quest) => (
          <div 
            key={quest.id}
            className={cn(
              "glass-panel rounded-xl p-4 border transition-all",
              quest.category ? "border-primary/40" : "border-white/10",
              "hover:border-primary/60"
            )}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1 flex-1">
                <h4 className="font-medium text-foreground">{quest.title}</h4>
                <div className="flex items-center gap-3 text-xs">
                  <span className={cn(
                    "font-medium",
                    quest.xp > 0 ? "text-accent" : "text-muted-foreground"
                  )}>
                    {quest.xp} EXP
                  </span>
                  <span className="text-muted-foreground">{quest.coins}</span>
                  {quest.coins > 0 && <span className="text-coins">🪙</span>}
                  <span className="text-muted-foreground">({quest.type})</span>
                  <span className="text-muted-foreground">[{quest.difficulty}]</span>
                </div>
                {quest.category && (
                  <div className="flex items-center gap-2 text-xs mt-1">
                    <Badge variant="outline" className="text-primary border-primary/50">
                      {quest.category}
                    </Badge>
                    {quest.dueDate && (
                      <span className="text-destructive">(Due: {quest.dueDate})</span>
                    )}
                    <span className="text-destructive">✕</span>
                    <span className="text-muted-foreground">[Custom]</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {quest.streakDays && (
                  <div className="flex items-center gap-1 text-streak">
                    <Flame className="w-4 h-4 animate-fire" />
                    <span className="text-sm font-medium">{quest.streakDays} Days</span>
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {quest.category ? (
                    <Settings className="w-4 h-4" />
                  ) : (
                    <Info className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
