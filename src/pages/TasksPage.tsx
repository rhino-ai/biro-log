import { useState, useEffect, useMemo } from 'react';
import { useGame } from '@/hooks/useGame';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2, Calendar, Clock, Bell, AlertTriangle, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HabitTemplates } from '@/components/game/HabitTemplates';
import { PushToggle } from '@/components/PushToggle';
import { scheduleReminder } from '@/lib/taskReminders';
import { scheduleLocalReminder, ensureNotificationPermission } from '@/lib/localReminders';
import { toast } from '@/hooks/use-toast';

const ringtones = [
  { id: 'default', name: '🔔 Default' },
  { id: 'alarm', name: '⏰ Alarm' },
  { id: 'bell', name: '🛎️ Bell' },
  { id: 'chime', name: '🎵 Chime' },
  { id: 'urgent', name: '🚨 Urgent' },
];

type Priority = 'random' | 'important' | 'most-important';

const PRIORITY_META: Record<Priority, { label: string; chip: string; row: string; dot: string; icon: string }> = {
  random: { label: 'Random', chip: 'bg-secondary/60 text-muted-foreground', row: 'border-white/10', dot: 'bg-muted-foreground', icon: '▫️' },
  important: { label: 'Important', chip: 'bg-amber-500/15 text-amber-300 border border-amber-500/30', row: 'border-amber-500/40 bg-amber-500/5', dot: 'bg-amber-400', icon: '⚡' },
  'most-important': { label: 'Most Important', chip: 'bg-red-500/15 text-red-300 border border-red-500/40 font-bold', row: 'border-red-500/50 bg-red-500/10 shadow-red-500/10', dot: 'bg-red-500', icon: '🔥' },
};

const TasksPage = () => {
  const { tasks, addTask, toggleTask, deleteTask, updateTask, jungles, checkDeadlinesAndUpdateBacklog } = useGame();
  const [activeTab, setActiveTab] = useState<'all' | 'daily' | 'weekly' | 'monthly'>('all');
  const [view, setView] = useState<'list' | 'week' | 'month'>('list');
  const [quickTitle, setQuickTitle] = useState('');
  const [quickType, setQuickType] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [quickPriority, setQuickPriority] = useState<Priority>('important');
  const [quickReminder, setQuickReminder] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '', type: 'daily' as 'daily' | 'weekly' | 'monthly' | 'custom',
    dueDate: undefined as Date | undefined, dueTime: '23:59',
    jungleId: jungles[0]?.id || '', priority: 'important' as Priority, notes: '', alarmEnabled: false, alarmTime: '09:00', ringtone: 'default',
  });

  useEffect(() => { checkDeadlinesAndUpdateBacklog(); }, [checkDeadlinesAndUpdateBacklog]);

  const quickAdd = async () => {
    const title = quickTitle.trim();
    if (!title) return;
    addTask({
      title, completed: false, type: quickType,
      jungleId: jungles[0]?.id || '',
      priority: quickPriority,
      dueDate: quickReminder ? quickReminder.slice(0, 10) : undefined,
      dueTime: quickReminder ? quickReminder.slice(11, 16) : undefined,
    });
    if (quickReminder) {
      const remindAt = new Date(quickReminder);
      if (!isNaN(remindAt.getTime()) && remindAt.getTime() > Date.now()) {
        // Immediate, precise local notification (no server delay).
        await ensureNotificationPermission();
        scheduleLocalReminder({ title: `⏰ ${title}`, body: 'Task reminder', url: '/tasks', at: remindAt.getTime() });
        const { error } = await scheduleReminder({ title, remindAt, jungleId: jungles[0]?.id || 'general', type: quickType });
        if (!error) toast({ title: '⏰ Reminder set', description: format(remindAt, 'PP p') });
      }
    }
    setQuickTitle(''); setQuickReminder(''); setQuickPriority('important');
  };

  const handleAddTask = () => {
    if (!newTask.title.trim()) return;
    addTask({
      title: newTask.title, completed: false, type: newTask.type,
      dueDate: newTask.dueDate ? format(newTask.dueDate, 'yyyy-MM-dd') : undefined,
      dueTime: newTask.dueTime, jungleId: newTask.jungleId,
      priority: newTask.priority,
      notes: newTask.notes,
      alarm: newTask.alarmEnabled ? { enabled: true, time: newTask.alarmTime, ringtone: newTask.ringtone } : undefined,
    });
    // Also schedule a server-side push reminder if alarm is on
    if (newTask.alarmEnabled && newTask.dueDate) {
      const [hh, mm] = newTask.alarmTime.split(':').map(Number);
      const d = new Date(newTask.dueDate); d.setHours(hh || 9, mm || 0, 0, 0);
      if (d.getTime() > Date.now()) {
        ensureNotificationPermission().then(() => {
          scheduleLocalReminder({ title: `⏰ ${newTask.title}`, body: 'Task reminder', url: '/tasks', at: d.getTime() });
        });
        scheduleReminder({ title: newTask.title, remindAt: d, jungleId: newTask.jungleId || 'general', type: newTask.type }).catch(() => {});
      }
    }
    setNewTask({ title: '', type: 'daily', dueDate: undefined, dueTime: '23:59', jungleId: jungles[0]?.id || '', priority: 'important', notes: '', alarmEnabled: false, alarmTime: '09:00', ringtone: 'default' });
    setIsAddDialogOpen(false);
  };

  const filteredTasks = activeTab === 'all' ? tasks : tasks.filter((t) => t.type === activeTab);
  const pendingTasks = filteredTasks.filter((t) => !t.completed);
  const completedTasks = filteredTasks.filter((t) => t.completed);
  const isOverdue = (task: typeof tasks[0]) => {
    if (!task.dueDate || task.completed) return false;
    return new Date(`${task.dueDate}T${task.dueTime || '23:59'}`) < new Date();
  };

  const sortedByPriority = (items: typeof tasks) => [...items].sort((a, b) => {
    const score = (p?: string) => p === 'most-important' ? 3 : p === 'important' ? 2 : 1;
    return score((b as any).priority) - score((a as any).priority);
  });

  const commitEdit = (id: string) => {
    if (editingTitle.trim()) updateTask(id, { title: editingTitle.trim() } as any);
    setEditingId(null); setEditingTitle('');
  };
  // ---- Week & Month grid data ----
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, []);
  const monthDays = useMemo(() => {
    const s = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 1 });
    const e = endOfMonth(monthCursor);
    return eachDayOfInterval({ start: s, end: addDays(e, 6 - (e.getDay() + 6) % 7) });
  }, [monthCursor]);
  const tasksForDay = (d: Date) => tasks.filter(t => {
    if (t.dueDate) { try { return isSameDay(parseISO(t.dueDate), d); } catch { return false; } }
    // recurring: daily shown every day, weekly on same weekday as today, monthly on 1st
    if (t.type === 'daily') return true;
    if (t.type === 'weekly') return d.getDay() === new Date().getDay();
    if (t.type === 'monthly') return d.getDate() === 1;
    return false;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between animate-fade-in">
          <BackButton to="/" />
          <div className="text-center flex-1"><h1 className="font-game text-xl">🎯 Goals & Tasks</h1></div>
          <div className="w-16" />
        </div>

        {/* View switcher */}
        <div className="flex items-center gap-2">
          {(['list', 'week', 'month'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={cn(
              'flex-1 px-3 py-1.5 rounded-full text-xs font-medium transition',
              view === v ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground'
            )}>
              {v === 'list' ? '📋 Today' : v === 'week' ? '📆 Week' : '🗓️ Month'}
            </button>
          ))}
        </div>

        {/* Quick-add composer */}
        <div className="glass-panel rounded-2xl p-3 border border-primary/30 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Add a task and press Enter…"
              value={quickTitle}
              onChange={(e) => setQuickTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') quickAdd(); }}
              className="bg-secondary/50 border-white/10"
            />
            <Button onClick={quickAdd} size="sm" className="bg-primary shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={quickType} onValueChange={(v) => setQuickType(v as any)}>
              <SelectTrigger className="bg-secondary/50 h-8 text-xs w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">📅 Daily</SelectItem>
                <SelectItem value="weekly">📆 Weekly</SelectItem>
                <SelectItem value="monthly">🗓️ Monthly</SelectItem>
                <SelectItem value="custom">⚙️ Custom</SelectItem>
              </SelectContent>
            </Select>
            <Select value={quickPriority} onValueChange={(v) => setQuickPriority(v as Priority)}>
              <SelectTrigger className="bg-secondary/50 h-8 text-xs w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="random">▫️ Random</SelectItem>
                <SelectItem value="important">⚡ Important</SelectItem>
                <SelectItem value="most-important">🔥 Most Important</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="datetime-local"
              value={quickReminder}
              onChange={(e) => setQuickReminder(e.target.value)}
              className="bg-secondary/50 h-8 text-xs flex-1 min-w-[10rem]"
              placeholder="Reminder…"
            />
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="h-8 text-xs">More…</Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-primary/30 max-w-md">
                <DialogHeader><DialogTitle className="font-game text-primary">New Goal 🎯</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-4">
                  <Input placeholder="What's your goal?" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} className="bg-secondary/50 border-white/10" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Type</label>
                      <Select value={newTask.type} onValueChange={(v) => setNewTask({ ...newTask, type: v as any })}><SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">📅 Daily</SelectItem><SelectItem value="weekly">📆 Weekly</SelectItem><SelectItem value="monthly">🗓️ Monthly</SelectItem><SelectItem value="custom">⚙️ Custom</SelectItem></SelectContent></Select>
                    </div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Track</label>
                      <Select value={newTask.jungleId} onValueChange={(v) => setNewTask({ ...newTask, jungleId: v })}><SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{jungles.map((j) => (<SelectItem key={j.id} value={j.id}>{j.icon} {j.name}</SelectItem>))}</SelectContent></Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Importance</label>
                      <Select value={newTask.priority} onValueChange={(v) => setNewTask({ ...newTask, priority: v as Priority })}><SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="random">▫️ Random</SelectItem><SelectItem value="important">⚡ Important</SelectItem><SelectItem value="most-important">🔥 Most Important</SelectItem></SelectContent></Select>
                    </div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Notes</label><Input value={newTask.notes} onChange={(e) => setNewTask({ ...newTask, notes: e.target.value })} placeholder="Chapter, target, pages…" className="bg-secondary/50" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="text-xs text-muted-foreground mb-1 block">Deadline Date</label>
                      <Popover><PopoverTrigger asChild><Button variant="outline" className="w-full justify-start text-left bg-secondary/50"><Calendar className="mr-2 h-4 w-4" />{newTask.dueDate ? format(newTask.dueDate, 'PP') : 'Pick date'}</Button></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><CalendarComponent mode="single" selected={newTask.dueDate} onSelect={(date) => setNewTask({ ...newTask, dueDate: date })} initialFocus className="p-3 pointer-events-auto" /></PopoverContent></Popover>
                    </div>
                    <div><label className="text-xs text-muted-foreground mb-1 block">Deadline Time</label><Input type="time" value={newTask.dueTime} onChange={(e) => setNewTask({ ...newTask, dueTime: e.target.value })} className="bg-secondary/50" /></div>
                  </div>
                  <div className="glass-panel rounded-xl p-3 border border-accent/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2"><Bell className="w-4 h-4 text-accent" /><span className="text-sm font-medium">Reminder Push</span></div>
                      <Button variant={newTask.alarmEnabled ? "default" : "outline"} size="sm" onClick={() => setNewTask({ ...newTask, alarmEnabled: !newTask.alarmEnabled })} className={newTask.alarmEnabled ? "bg-accent" : ""}>{newTask.alarmEnabled ? 'ON' : 'OFF'}</Button>
                    </div>
                    {newTask.alarmEnabled && (
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-xs text-muted-foreground mb-1 block">Time</label><Input type="time" value={newTask.alarmTime} onChange={(e) => setNewTask({ ...newTask, alarmTime: e.target.value })} className="bg-secondary/50" /></div>
                        <div><label className="text-xs text-muted-foreground mb-1 block">Ringtone</label><Select value={newTask.ringtone} onValueChange={(v) => setNewTask({ ...newTask, ringtone: v })}><SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger><SelectContent>{ringtones.map((r) => (<SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>))}</SelectContent></Select></div>
                      </div>
                    )}
                  </div>
                  <Button onClick={handleAddTask} className="w-full bg-primary hover:bg-primary/80"><Plus className="w-4 h-4 mr-2" /> Add Goal</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Templates as prominent chips */}
        <HabitTemplates compact />

        {/* Notification enable card — required for task reminders */}
        <PushToggle />

        {view === 'list' && (
          <>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {(['all', 'daily', 'weekly', 'monthly'] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap", activeTab === tab ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:bg-secondary")}>
              {tab === 'all' && '📋'} {tab === 'daily' && '📅'} {tab === 'weekly' && '📆'} {tab === 'monthly' && '🗓️'} {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <div className="space-y-3">
          <h2 className="font-game text-lg flex items-center gap-2"><span>📋</span> Pending ({pendingTasks.length})</h2>
          {pendingTasks.length === 0 ? (
            <div className="glass-panel rounded-xl p-6 text-center"><span className="text-4xl mb-2 block">🎉</span><p className="text-muted-foreground text-sm">All tasks completed!</p></div>
          ) : (
            <div className="space-y-2">
              {sortedByPriority(pendingTasks).map((task) => {
                const jungle = jungles.find((j) => j.id === task.jungleId);
                const overdue = isOverdue(task);
                const priority = ((task as any).priority || 'random') as Priority;
                const meta = PRIORITY_META[priority];
                return (
                  <div key={task.id} className={cn("task-item group border", meta.row, overdue && "border-destructive/50 bg-destructive/10 animate-pulse")}>
                    <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} className="border-accent data-[state=checked]:bg-accent" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {editingId === task.id ? (
                          <>
                            <Input
                              autoFocus
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(task.id); if (e.key === 'Escape') { setEditingId(null); } }}
                              className="h-7 text-sm bg-secondary/50"
                            />
                            <button onClick={() => commitEdit(task.id)} className="text-green-400"><Check className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <p
                            className={cn("text-sm truncate cursor-text", priority === 'most-important' && 'font-bold text-red-100')}
                            onClick={() => { setEditingId(task.id); setEditingTitle(task.title); }}
                            title="Tap to edit"
                          >{task.title}</p>
                        )}
                        <Select value={priority} onValueChange={(v) => updateTask(task.id, { priority: v as any } as any)}>
                          <SelectTrigger className="h-6 w-24 text-[10px] bg-background/50 border-white/10"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="random">▫️ Random</SelectItem>
                            <SelectItem value="important">⚡ Important</SelectItem>
                            <SelectItem value="most-important">🔥 Most</SelectItem>
                          </SelectContent>
                        </Select>
                        {overdue && <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {jungle && <span className="text-xs text-muted-foreground">{jungle.icon} {jungle.name}</span>}
                        {task.dueDate && <span className={cn("text-xs flex items-center gap-1", overdue ? "text-destructive font-bold" : "text-muted-foreground")}><Clock className="w-3 h-3" />{format(new Date(task.dueDate), 'MMM d')} {task.dueTime}</span>}
                        {task.alarm?.enabled && <span className="text-xs text-accent flex items-center gap-1"><Bell className="w-3 h-3" />{task.alarm.time}</span>}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">{task.type}</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full", meta.chip)}>{meta.icon} {meta.label}</span>
                        {(task as any).notes && <span className="text-xs text-muted-foreground truncate max-w-[12rem]">{(task as any).notes}</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteTask(task.id)} className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-opacity"><Trash2 size={16} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        {completedTasks.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-game text-lg flex items-center gap-2 text-muted-foreground"><span>✓</span> Completed ({completedTasks.length})</h2>
            <div className="space-y-2">
              {completedTasks.map((task) => (
                <div key={task.id} className="task-item opacity-60">
                  <Checkbox checked={task.completed} onCheckedChange={() => toggleTask(task.id)} className="border-accent data-[state=checked]:bg-accent" />
                  <p className="text-sm line-through text-muted-foreground flex-1">{task.title}</p>
                  <button onClick={() => deleteTask(task.id)} className="text-destructive/50 hover:text-destructive transition-colors"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
          </>
        )}

        {view === 'week' && (
          <div className="space-y-2">
            <h2 className="font-game text-sm text-muted-foreground">This Week</h2>
            <div className="grid grid-cols-1 gap-2">
              {weekDays.map((d) => {
                const items = tasksForDay(d);
                const today = isSameDay(d, new Date());
                return (
                  <div key={d.toISOString()} className={cn('glass-panel rounded-xl p-3 border', today ? 'border-primary/50 bg-primary/5' : 'border-white/10')}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className={cn('text-xs font-game', today && 'text-primary')}>{format(d, 'EEE, MMM d')}</p>
                      <span className="text-[10px] text-muted-foreground">{items.length} task{items.length === 1 ? '' : 's'}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">No tasks</p>
                    ) : (
                      <div className="space-y-1">
                        {sortedByPriority(items).slice(0, 5).map(t => {
                          const meta = PRIORITY_META[((t as any).priority || 'random') as Priority];
                          return <div key={t.id} className={cn("flex items-center gap-2 text-xs rounded-md px-2 py-1", meta.row)}>
                            <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t.id)} className="scale-75" />
                            <span className={cn('w-1.5 h-1.5 rounded-full', meta.dot)} />
                            <span className={cn('truncate flex-1', (t as any).priority === 'most-important' && 'font-bold', t.completed && 'line-through text-muted-foreground')}>{t.title}</span>
                            {t.dueTime && <span className="text-muted-foreground text-[10px]">{t.dueTime}</span>}
                          </div>;
                        })}
                        {items.length > 5 && <p className="text-[10px] text-muted-foreground">+{items.length - 5} more</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'month' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <button className="text-xs text-muted-foreground px-2 py-1" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1))}>◀</button>
              <h2 className="font-game text-sm">{format(monthCursor, 'MMMM yyyy')}</h2>
              <button className="text-xs text-muted-foreground px-2 py-1" onClick={() => setMonthCursor(new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1))}>▶</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
              {['M','T','W','T','F','S','S'].map((d,i) => <div key={i}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {monthDays.map(d => {
                const items = tasksForDay(d);
                const inMonth = isSameMonth(d, monthCursor);
                const today = isSameDay(d, new Date());
                return (
                  <button key={d.toISOString()} onClick={() => setSelectedDay(d)} className={cn(
                    'aspect-square rounded-md text-xs flex flex-col items-center justify-center gap-0.5 border',
                    today ? 'border-primary bg-primary/10' : 'border-white/5',
                    !inMonth && 'opacity-30'
                  )}>
                    <span className={cn(today && 'text-primary font-bold')}>{format(d, 'd')}</span>
                    {items.length > 0 && (
                      <span className="flex gap-0.5">
                        {sortedByPriority(items).slice(0, 3).map((t, i) => <span key={i} className={cn("w-1.5 h-1.5 rounded-full", PRIORITY_META[((t as any).priority || 'random') as Priority].dot)} />)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {selectedDay && (
              <div className="glass-panel rounded-xl p-3 border border-primary/30 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-game">{format(selectedDay, 'EEEE, MMM d')}</p>
                  <button className="text-muted-foreground" onClick={() => setSelectedDay(null)}><X className="w-4 h-4" /></button>
                </div>
                {tasksForDay(selectedDay).length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No tasks</p>
                ) : (
                  <div className="space-y-1">
                    {sortedByPriority(tasksForDay(selectedDay)).map(t => {
                      const meta = PRIORITY_META[((t as any).priority || 'random') as Priority];
                      return <div key={t.id} className={cn("flex items-center gap-2 text-xs rounded-md px-2 py-1", meta.row)}>
                        <Checkbox checked={t.completed} onCheckedChange={() => toggleTask(t.id)} className="scale-75" />
                        <span className={cn('truncate flex-1', (t as any).priority === 'most-important' && 'font-bold', t.completed && 'line-through text-muted-foreground')}>{t.title}</span>
                        {t.dueTime && <span className="text-muted-foreground text-[10px]">{t.dueTime}</span>}
                      </div>;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div className="glass-panel rounded-2xl p-4 border border-accent/20">
          <div className="flex items-start gap-3"><span className="text-2xl">⚠️</span><div><h3 className="font-game text-sm mb-1 text-destructive">Deadline Warning!</h3><p className="text-xs text-muted-foreground">Miss a deadline → Task goes to BACKLOG → RAID MODE activates! Complete tasks on time to keep your jungle healthy! 🌴</p></div></div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default TasksPage;
