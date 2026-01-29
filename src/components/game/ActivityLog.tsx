import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar, List, Star, Zap, CheckCircle, AlertTriangle } from 'lucide-react';

interface ActivityEntry {
  id: string;
  time: string;
  type: 'chapter' | 'level' | 'damage' | 'complete' | 'streak';
  icon: string;
  message: string;
  xp?: number;
  coins?: number;
}

// Mock activity data - in real app this would come from state/API
const mockActivities: ActivityEntry[] = [
  { id: '1', time: '18:55', type: 'chapter', icon: '◆', message: 'Chapter: Electric Potential And Dipole (Physics)', xp: 50 },
  { id: '2', time: '18:53', type: 'chapter', icon: '◆', message: 'Chapter: Electric Potential And Dipole (Physics)', xp: 30 },
  { id: '3', time: '18:55', type: 'damage', icon: '💥', message: 'Damaged Lecture Backlog for 100 via Electrics: Lecture 24.' },
  { id: '4', time: '18:55', type: 'level', icon: '⭐', message: 'Reached Overall Level 9!' },
  { id: '5', time: '18:55', type: 'complete', icon: '✅', message: 'Completed: Electrics: Lecture 24 (+100 Global EXP, +0 Coins)', xp: 100, coins: 0 },
];

export const ActivityLog = () => {
  const { xp, coins, level, streak } = useGameStore();
  const [activeTab, setActiveTab] = useState<'activity' | 'practice' | 'calendar'>('activity');
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  // Generate days for the week
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
      date: date.getDate(),
      isToday: i === 6,
    };
  });

  const dailySummary = {
    totalXP: 500,
    coinsGained: 10,
    coinsSpent: 0,
    subjectXP: {
      MA: 0,
      PH: 0,
      'P.': 0,
      'I.': 0,
      'O.': 0,
    },
  };

  return (
    <div className="glass-panel rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 p-4 border-b border-primary/20">
        <List className="w-6 h-6 text-primary" />
        <h2 className="font-game text-xl text-primary text-glow-purple">ACTIVITY LOG</h2>
      </div>

      {/* Day Selector */}
      <div className="flex gap-2 p-4 overflow-x-auto">
        {weekDays.map((day, index) => (
          <Button
            key={index}
            variant={day.isToday ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedDay(day.date)}
            className={cn(
              "min-w-[70px] flex-col gap-0",
              day.isToday && "bg-primary text-primary-foreground"
            )}
          >
            <span className="text-xs">{day.day}</span>
            <span className="text-sm font-medium">{day.date}</span>
          </Button>
        ))}
      </div>

      {/* Summary Section */}
      <div className="px-4 pb-4 border-b border-primary/20">
        <h3 className="font-game text-sm text-muted-foreground mb-3 text-center">SUMMARY FOR TODAY</h3>
        <div className="flex justify-around text-sm">
          <div>
            <span className="text-muted-foreground">Overall EXP: </span>
            <span className="text-accent font-medium">{dailySummary.totalXP}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Coins Gained: </span>
            <span className="text-coins font-medium">{dailySummary.coinsGained}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Coins Spent: </span>
            <span className="text-foreground font-medium">{dailySummary.coinsSpent}</span>
          </div>
        </div>
        <div className="flex justify-center gap-4 mt-2 text-xs text-muted-foreground">
          <span>Subject EXP:</span>
          {Object.entries(dailySummary.subjectXP).map(([key, val]) => (
            <span key={key}>{key}:{val}</span>
          ))}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-primary/20">
        {['practice', 'activity', 'calendar'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={cn(
              "flex-1 py-2 text-sm font-medium transition-colors",
              activeTab === tab 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            • {tab.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {activeTab === 'activity' && (
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {mockActivities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 text-sm">
              <span className="text-muted-foreground text-xs min-w-[40px]">{activity.time}</span>
              <span className={cn(
                "text-lg",
                activity.type === 'chapter' && "text-primary",
                activity.type === 'level' && "text-coins",
                activity.type === 'damage' && "text-destructive",
                activity.type === 'complete' && "text-accent"
              )}>
                {activity.icon}
              </span>
              <span className={cn(
                activity.type === 'damage' && "text-destructive",
                activity.type === 'complete' && "text-accent"
              )}>
                {activity.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'practice' && (
        <div className="p-4 text-center text-muted-foreground">
          <p>Practice questions completed today: 0</p>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="p-4 text-center text-muted-foreground">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Monthly calendar view coming soon</p>
        </div>
      )}
    </div>
  );
};
