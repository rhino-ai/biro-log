import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const TasksPage = () => {
  const { tasks, addTask, toggleTask, deleteTask, jungles } = useGameStore();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [selectedJungle, setSelectedJungle] = useState(jungles[0]?.id || '');

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return;
    addTask({
      title: newTaskTitle,
      completed: false,
      jungleId: selectedJungle,
      type: 'custom',
    });
    setNewTaskTitle('');
  };

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="font-game text-2xl text-glow-purple">
            ✅ Daily Tasks
          </h1>
          <p className="text-muted-foreground text-sm">
            Complete tasks to earn XP & coins
          </p>
        </div>

        {/* Add Task Form */}
        <div className="glass-panel rounded-2xl p-4 space-y-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="flex gap-2">
            <Input
              placeholder="Add a new task..."
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
              className="bg-secondary/50 border-white/10 focus:border-primary"
            />
            <Button onClick={handleAddTask} size="icon" className="shrink-0">
              <Plus size={20} />
            </Button>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-1">
            {jungles.map((jungle) => (
              <button
                key={jungle.id}
                onClick={() => setSelectedJungle(jungle.id)}
                className={cn(
                  'flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all',
                  selectedJungle === jungle.id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
                )}
              >
                {jungle.icon} {jungle.name}
              </button>
            ))}
          </div>
        </div>

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
                return (
                  <div
                    key={task.id}
                    className="task-item group"
                  >
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="border-accent data-[state=checked]:bg-accent"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.title}</p>
                      {jungle && (
                        <p className="text-xs text-muted-foreground">
                          {jungle.icon} {jungle.name}
                        </p>
                      )}
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

        {/* Daily Goals Info */}
        <div className="glass-panel rounded-2xl p-4 border border-accent/20 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="font-medium text-sm mb-1">Task Rewards</h3>
              <p className="text-xs text-muted-foreground">
                Complete all daily tasks to maintain your streak and earn bonus XP! 
                Each completed task gives you +10 XP and +5 coins.
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
