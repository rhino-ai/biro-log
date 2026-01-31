import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { Calendar, List, CheckCircle, Star, Zap } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday } from 'date-fns';

interface ActivityEntry {
  id: string;
  time: string;
  date: string;
  type: 'chapter' | 'level' | 'damage' | 'complete' | 'streak' | 'task';
  icon: string;
  message: string;
  xp?: number;
  coins?: number;
}

export const ActivityLog = () => {
  const { xp, coins, level, streak, tasks, testRecords } = useGameStore();
  const [activeTab, setActiveTab] = useState<'activity' | 'calendar'>('activity');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [activities, setActivities] = useState<ActivityEntry[]>([]);

  // Generate activities from completed tasks and real data
  useEffect(() => {
    const completedTasks = tasks.filter(t => t.completed);
    const newActivities: ActivityEntry[] = [];

    completedTasks.forEach((task, index) => {
      newActivities.push({
        id: task.id,
        time: format(new Date(task.createdAt), 'HH:mm'),
        date: format(new Date(task.createdAt), 'yyyy-MM-dd'),
        type: 'complete',
        icon: '✅',
        message: `Completed: ${task.title}`,
        xp: task.type === 'daily' ? 15 : task.type === 'weekly' ? 50 : 100,
        coins: task.type === 'daily' ? 5 : task.type === 'weekly' ? 20 : 50,
      });
    });

    // Add test records
    testRecords.forEach((record) => {
      newActivities.push({
        id: record.id,
        time: '12:00',
        date: record.date,
        type: 'task',
        icon: '📝',
        message: `Test: ${record.testName} - ${record.scoredMarks}/${record.maxMarks}`,
        xp: Math.round(record.scoredMarks / 2),
      });
    });

    // Sort by date, newest first
    newActivities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setActivities(newActivities);
  }, [tasks, testRecords]);

  // Calendar data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get activity counts per day
  const activityByDay = activities.reduce((acc, activity) => {
    const day = activity.date;
    if (!acc[day]) acc[day] = 0;
    acc[day]++;
    return acc;
  }, {} as Record<string, number>);

  const dailySummary = {
    totalXP: activities.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).reduce((sum, a) => sum + (a.xp || 0), 0),
    coinsGained: activities.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).reduce((sum, a) => sum + (a.coins || 0), 0),
    tasksCompleted: activities.filter(a => a.date === format(new Date(), 'yyyy-MM-dd') && a.type === 'complete').length,
  };

  return (
    <div className="glass-panel rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-center gap-3 p-4 border-b border-primary/20">
        <List className="w-6 h-6 text-primary" />
        <h2 className="font-game text-xl text-primary text-glow-purple">ACTIVITY LOG</h2>
      </div>

      {/* Summary Section */}
      <div className="px-4 py-3 border-b border-primary/20 bg-gradient-to-r from-accent/5 to-primary/5">
        <h3 className="font-game text-sm text-muted-foreground mb-2 text-center">TODAY'S SUMMARY</h3>
        <div className="flex justify-around text-sm">
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Zap className="w-4 h-4 text-accent" />
              <span className="font-game text-accent">{dailySummary.totalXP || xp}</span>
            </div>
            <span className="text-xs text-muted-foreground">XP Earned</span>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <span className="text-coins">🪙</span>
              <span className="font-game text-coins">{dailySummary.coinsGained || coins}</span>
            </div>
            <span className="text-xs text-muted-foreground">Coins</span>
          </div>
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="font-game text-green-400">{dailySummary.tasksCompleted}</span>
            </div>
            <span className="text-xs text-muted-foreground">Tasks Done</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b border-primary/20">
        {[
          { id: 'activity', label: 'Activity', icon: List },
          { id: 'calendar', label: 'Calendar', icon: Calendar },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2",
              activeTab === tab.id 
                ? "text-primary border-b-2 border-primary bg-primary/5" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activity List */}
      {activeTab === 'activity' && (
        <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
          {activities.length === 0 ? (
            <div className="text-center py-8">
              <span className="text-4xl block mb-2">📊</span>
              <p className="text-muted-foreground text-sm">No activity yet</p>
              <p className="text-xs text-muted-foreground">Complete tasks to see your progress!</p>
            </div>
          ) : (
            activities.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 text-sm glass-panel rounded-lg p-2">
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
                <div className="flex-1 min-w-0">
                  <span className={cn(
                    "text-sm",
                    activity.type === 'damage' && "text-destructive",
                    activity.type === 'complete' && "text-accent"
                  )}>
                    {activity.message}
                  </span>
                  {(activity.xp || activity.coins) && (
                    <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                      {activity.xp && <span>+{activity.xp} XP</span>}
                      {activity.coins && <span>+{activity.coins} 🪙</span>}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Calendar View */}
      {activeTab === 'calendar' && (
        <div className="p-4">
          <div className="flex justify-between items-center mb-4">
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() - 1)))}
              className="text-muted-foreground hover:text-foreground"
            >
              ←
            </button>
            <span className="font-game text-sm">{format(currentMonth, 'MMMM yyyy')}</span>
            <button 
              onClick={() => setCurrentMonth(new Date(currentMonth.setMonth(currentMonth.getMonth() + 1)))}
              className="text-muted-foreground hover:text-foreground"
            >
              →
            </button>
          </div>
          
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
              <div key={i} className="text-center text-xs text-muted-foreground">{day}</div>
            ))}
          </div>
          
          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before month starts */}
            {Array.from({ length: monthStart.getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            
            {daysInMonth.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const activityCount = activityByDay[dateStr] || 0;
              const hasActivity = activityCount > 0;
              
              return (
                <div
                  key={dateStr}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center text-xs",
                    isToday(day) && "ring-2 ring-primary",
                    hasActivity && "bg-accent/20"
                  )}
                >
                  <span className={cn(
                    isToday(day) ? "text-primary font-bold" : "text-muted-foreground"
                  )}>
                    {format(day, 'd')}
                  </span>
                  {hasActivity && (
                    <Star className="w-3 h-3 text-accent mt-0.5" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
