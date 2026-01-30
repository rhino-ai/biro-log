import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Target, Plus, Trash2, Calendar, Clock, Bell, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const ringtones = [
  { id: 'default', name: '🔔 Default' },
  { id: 'alarm', name: '⏰ Alarm' },
  { id: 'bell', name: '🛎️ Bell' },
  { id: 'chime', name: '🎵 Chime' },
  { id: 'urgent', name: '🚨 Urgent' },
];

export const GoalPanel = () => {
  const { tasks, addTask, toggleTask, deleteTask, jungles, checkDeadlinesAndUpdateBacklog } = useGameStore();
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    type: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
    dueDate: undefined as Date | undefined,
    dueTime: '23:59',
    jungleId: jungles[0]?.id || '',
    alarmEnabled: false,
    alarmTime: '09:00',
    ringtone: 'default',
  });

  // Check deadlines on mount
  useState(() => {
    checkDeadlinesAndUpdateBacklog();
  });

  const filteredTasks = tasks.filter((t) => t.type === activeTab);
  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const handleAddGoal = () => {
    if (!newGoal.title.trim()) return;
    
    addTask({
      title: newGoal.title,
      completed: false,
      type: newGoal.type,
      dueDate: newGoal.dueDate ? format(newGoal.dueDate, 'yyyy-MM-dd') : undefined,
      dueTime: newGoal.dueTime,
      jungleId: newGoal.jungleId,
      alarm: newGoal.alarmEnabled ? {
        enabled: true,
        time: newGoal.alarmTime,
        ringtone: newGoal.ringtone,
      } : undefined,
    });
    
    setNewGoal({
      title: '',
      type: 'daily',
      dueDate: undefined,
      dueTime: '23:59',
      jungleId: jungles[0]?.id || '',
      alarmEnabled: false,
      alarmTime: '09:00',
      ringtone: 'default',
    });
    setIsAddDialogOpen(false);
  };

  const isOverdue = (task: typeof tasks[0]) => {
    if (!task.dueDate || task.completed) return false;
    const deadline = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
    return deadline < new Date();
  };

  return (
    <div className="glass-panel rounded-2xl border border-primary/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary/20">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-primary animate-pulse" />
          <h2 className="font-game text-xl text-primary text-glow-purple">GOALS</h2>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 bg-accent hover:bg-accent/80">
              <Plus className="w-4 h-4" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-primary/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-game text-primary">New Goal 🎯</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="What's your goal?"
                value={newGoal.title}
                onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                className="bg-secondary/50 border-white/10"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <Select
                    value={newGoal.type}
                    onValueChange={(v) => setNewGoal({ ...newGoal, type: v as any })}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">📅 Daily</SelectItem>
                      <SelectItem value="weekly">📆 Weekly</SelectItem>
                      <SelectItem value="monthly">🗓️ Monthly</SelectItem>
                      <SelectItem value="custom">⚙️ Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Track</label>
                  <Select
                    value={newGoal.jungleId}
                    onValueChange={(v) => setNewGoal({ ...newGoal, jungleId: v })}
                  >
                    <SelectTrigger className="bg-secondary/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {jungles.map((j) => (
                        <SelectItem key={j.id} value={j.id}>
                          {j.icon} {j.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Deadline */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Deadline Date</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left bg-secondary/50">
                        <Calendar className="mr-2 h-4 w-4" />
                        {newGoal.dueDate ? format(newGoal.dueDate, 'PP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newGoal.dueDate}
                        onSelect={(date) => setNewGoal({ ...newGoal, dueDate: date })}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Deadline Time</label>
                  <Input
                    type="time"
                    value={newGoal.dueTime}
                    onChange={(e) => setNewGoal({ ...newGoal, dueTime: e.target.value })}
                    className="bg-secondary/50"
                  />
                </div>
              </div>

              {/* Alarm Settings */}
              <div className="glass-panel rounded-xl p-3 border border-accent/20">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-accent" />
                    <span className="text-sm font-medium">Reminder Alarm</span>
                  </div>
                  <Button
                    variant={newGoal.alarmEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewGoal({ ...newGoal, alarmEnabled: !newGoal.alarmEnabled })}
                    className={newGoal.alarmEnabled ? "bg-accent" : ""}
                  >
                    {newGoal.alarmEnabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
                
                {newGoal.alarmEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                      <Input
                        type="time"
                        value={newGoal.alarmTime}
                        onChange={(e) => setNewGoal({ ...newGoal, alarmTime: e.target.value })}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Ringtone</label>
                      <Select
                        value={newGoal.ringtone}
                        onValueChange={(v) => setNewGoal({ ...newGoal, ringtone: v })}
                      >
                        <SelectTrigger className="bg-secondary/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ringtones.map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
              </div>

              <Button onClick={handleAddGoal} className="w-full bg-primary hover:bg-primary/80">
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center border-b border-primary/20">
        {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 py-3 text-sm font-medium transition-all uppercase",
              activeTab === tab 
                ? "text-primary-foreground bg-primary/80 text-glow-purple" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            )}
          >
            {tab === 'daily' && '📅'} {tab === 'weekly' && '📆'} {tab === 'monthly' && '🗓️'} {tab}
          </button>
        ))}
      </div>

      {/* Goals List */}
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {pendingTasks.length === 0 && completedTasks.length === 0 ? (
          <div className="text-center py-8">
            <span className="text-4xl block mb-2">🎯</span>
            <p className="text-muted-foreground text-sm">No {activeTab} goals yet</p>
            <p className="text-xs text-muted-foreground">Add one to start tracking!</p>
          </div>
        ) : (
          <>
            {pendingTasks.map((task) => {
              const jungle = jungles.find((j) => j.id === task.jungleId);
              const overdue = isOverdue(task);
              
              return (
                <div 
                  key={task.id}
                  className={cn(
                    "glass-panel rounded-xl p-4 border transition-all",
                    overdue 
                      ? "border-raid/50 bg-raid/10 animate-pulse" 
                      : "border-white/10 hover:border-primary/40"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className="mt-1 text-muted-foreground hover:text-accent transition-colors"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground">{task.title}</h4>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {jungle && (
                          <Badge variant="outline" className="text-xs">
                            {jungle.icon} {jungle.name}
                          </Badge>
                        )}
                        {task.dueDate && (
                          <span className={cn(
                            "text-xs flex items-center gap-1",
                            overdue ? "text-raid font-bold" : "text-muted-foreground"
                          )}>
                            <Clock className="w-3 h-3" />
                            {format(new Date(task.dueDate), 'MMM d')} {task.dueTime}
                            {overdue && <span className="ml-1">⚠️ OVERDUE</span>}
                          </span>
                        )}
                        {task.alarm?.enabled && (
                          <span className="text-xs text-accent flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            {task.alarm.time}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="text-muted-foreground hover:text-raid transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
            
            {completedTasks.length > 0 && (
              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">✓ Completed ({completedTasks.length})</p>
                {completedTasks.map((task) => (
                  <div 
                    key={task.id}
                    className="glass-panel rounded-xl p-3 border border-white/5 opacity-60 mb-2"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-4 h-4 text-accent" />
                      <span className="text-sm line-through text-muted-foreground flex-1">{task.title}</span>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="text-muted-foreground/50 hover:text-raid"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
