import { useState, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Calendar, Clock, Bell, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const ringtones = [
  { id: 'default', name: '🔔 Default' },
  { id: 'alarm', name: '⏰ Alarm' },
  { id: 'bell', name: '🛎️ Bell' },
  { id: 'chime', name: '🎵 Chime' },
  { id: 'urgent', name: '🚨 Urgent' },
];

const TasksPage = () => {
  const { tasks, addTask, toggleTask, deleteTask, jungles, checkDeadlinesAndUpdateBacklog } = useGameStore();
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
    dueDate: undefined as Date | undefined,
    dueTime: '23:59',
    jungleId: jungles[0]?.id || '',
    alarmEnabled: false,
    alarmTime: '09:00',
    ringtone: 'default',
  });

  useEffect(() => {
    checkDeadlinesAndUpdateBacklog();
  }, [checkDeadlinesAndUpdateBacklog]);

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    addTask({
      title: newTask.title,
      completed: false,
      type: newTask.type,
      dueDate: newTask.dueDate ? format(newTask.dueDate, 'yyyy-MM-dd') : undefined,
      dueTime: newTask.dueTime,
      jungleId: newTask.jungleId,
      alarm: newTask.alarmEnabled ? {
        enabled: true,
        time: newTask.alarmTime,
        ringtone: newTask.ringtone,
      } : undefined,
    });
    setNewTask({
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

  const filteredTasks = activeTab === 'all' 
    ? tasks 
    : tasks.filter((t) => t.type === activeTab);
  
  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);

  const isOverdue = (task: typeof tasks[0]) => {
    if (!task.dueDate || task.completed) return false;
    const deadline = new Date(`${task.dueDate}T${task.dueTime || '23:59'}`);
    return deadline < new Date();
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <BackButton to="/" />
          <div className="text-center flex-1">
            <h1 className="font-game text-xl text-glow-purple">
              🎯 Goals & Tasks
            </h1>
          </div>
          <div className="w-16" />
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          {(['all', 'daily', 'weekly', 'monthly'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
              )}
            >
              {tab === 'all' && '📋'} {tab === 'daily' && '📅'} {tab === 'weekly' && '📆'} {tab === 'monthly' && '🗓️'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Add Task Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2 bg-accent hover:bg-accent/80 animate-fade-in" style={{ animationDelay: '0.15s' }}>
              <Plus size={20} />
              Add New Goal
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-panel border-primary/30 max-w-md">
            <DialogHeader>
              <DialogTitle className="font-game text-primary">New Goal 🎯</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="What's your goal?"
                value={newTask.title}
                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                className="bg-secondary/50 border-white/10"
              />
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <Select
                    value={newTask.type}
                    onValueChange={(v) => setNewTask({ ...newTask, type: v as any })}
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
                    value={newTask.jungleId}
                    onValueChange={(v) => setNewTask({ ...newTask, jungleId: v })}
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
                        {newTask.dueDate ? format(newTask.dueDate, 'PP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={newTask.dueDate}
                        onSelect={(date) => setNewTask({ ...newTask, dueDate: date })}
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
                    value={newTask.dueTime}
                    onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })}
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
                    variant={newTask.alarmEnabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => setNewTask({ ...newTask, alarmEnabled: !newTask.alarmEnabled })}
                    className={newTask.alarmEnabled ? "bg-accent" : ""}
                  >
                    {newTask.alarmEnabled ? 'ON' : 'OFF'}
                  </Button>
                </div>
                
                {newTask.alarmEnabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                      <Input
                        type="time"
                        value={newTask.alarmTime}
                        onChange={(e) => setNewTask({ ...newTask, alarmTime: e.target.value })}
                        className="bg-secondary/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Ringtone</label>
                      <Select
                        value={newTask.ringtone}
                        onValueChange={(v) => setNewTask({ ...newTask, ringtone: v })}
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

              <Button onClick={handleAddTask} className="w-full bg-primary hover:bg-primary/80">
                <Plus className="w-4 h-4 mr-2" />
                Add Goal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Pending Tasks */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h2 className="font-game text-lg flex items-center gap-2">
            <span>📋</span> Pending ({pendingTasks.length})
          </h2>
          
          {pendingTasks.length === 0 ? (
            <div className="glass-panel rounded-xl p-6 text-center">
              <span className="text-4xl mb-2 block">🎉</span>
              <p className="text-muted-foreground text-sm">All tasks completed!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingTasks.map((task) => {
                const jungle = jungles.find((j) => j.id === task.jungleId);
                const overdue = isOverdue(task);
                
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "task-item group",
                      overdue && "border-raid/50 bg-raid/10 animate-pulse"
                    )}
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="border-accent data-[state=checked]:bg-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm truncate">{task.title}</p>
                        {overdue && (
                          <AlertTriangle className="w-4 h-4 text-raid shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {jungle && (
                          <span className="text-xs text-muted-foreground">
                            {jungle.icon} {jungle.name}
                          </span>
                        )}
                        {task.dueDate && (
                          <span className={cn(
                            "text-xs flex items-center gap-1",
                            overdue ? "text-raid font-bold" : "text-muted-foreground"
                          )}>
                            <Clock className="w-3 h-3" />
                            {format(new Date(task.dueDate), 'MMM d')} {task.dueTime}
                          </span>
                        )}
                        {task.alarm?.enabled && (
                          <span className="text-xs text-accent flex items-center gap-1">
                            <Bell className="w-3 h-3" />
                            {task.alarm.time}
                          </span>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                          {task.type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 text-raid hover:text-raid/80 transition-opacity"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <h2 className="font-game text-lg flex items-center gap-2 text-muted-foreground">
              <span>✓</span> Completed ({completedTasks.length})
            </h2>
            
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="task-item opacity-60"
                >
                  <Checkbox
                    checked={task.completed}
                    onCheckedChange={() => toggleTask(task.id)}
                    className="border-accent data-[state=checked]:bg-accent"
                  />
                  <p className="text-sm line-through text-muted-foreground flex-1">
                    {task.title}
                  </p>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-raid/50 hover:text-raid transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="glass-panel rounded-2xl p-4 border border-accent/20 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-game text-sm mb-1 text-raid">Deadline Warning!</h3>
              <p className="text-xs text-muted-foreground">
                Miss a deadline → Task goes to BACKLOG → RAID MODE activates! 
                Complete tasks on time to keep your jungle healthy! 🌴
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default TasksPage;
