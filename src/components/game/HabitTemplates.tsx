import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { Sparkles } from 'lucide-react';

interface Template {
  emoji: string;
  title: string;
  type: 'daily' | 'weekly';
  time?: string;
  alarm?: boolean;
}

const TEMPLATES: Template[] = [
  { emoji: '⏰', title: 'Wake up 5:30 AM', type: 'daily', time: '05:30', alarm: true },
  { emoji: '🧘', title: '10 min meditation', type: 'daily', time: '06:00' },
  { emoji: '📺', title: 'PW lecture (1.5 hr)', type: 'daily', time: '07:00' },
  { emoji: '📝', title: 'NCERT reading 30 min', type: 'daily', time: '09:00' },
  { emoji: '🧪', title: 'Solve 20 PYQs', type: 'daily', time: '17:00' },
  { emoji: '📐', title: 'Math practice 1 hr', type: 'daily', time: '18:30' },
  { emoji: '🔁', title: 'Revise yesterday\'s chapter', type: 'daily', time: '21:00', alarm: true },
  { emoji: '🛌', title: 'Sleep by 11 PM', type: 'daily', time: '23:00', alarm: true },
  { emoji: '🏃', title: 'Exercise 30 min', type: 'daily', time: '06:30' },
  { emoji: '📊', title: 'Weekly mock test', type: 'weekly', time: '10:00' },
  { emoji: '📔', title: 'Weekly revision day', type: 'weekly' },
  { emoji: '🚫', title: 'No reels day', type: 'daily' },
];

export const HabitTemplates = () => {
  const { addTask, jungles } = useGame();

  const apply = (t: Template) => {
    addTask({
      title: `${t.emoji} ${t.title}`,
      completed: false,
      type: t.type,
      dueTime: t.time,
      jungleId: jungles[0]?.id || '',
      alarm: t.alarm && t.time ? { enabled: true, time: t.time, ringtone: 'default' } : undefined,
    });
    toast({ title: 'Habit added ✅', description: t.title });
  };

  return (
    <div className="glass-panel rounded-2xl p-4 border border-primary/20 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-game text-sm">Habit Templates</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">tap to add</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {TEMPLATES.map((t) => (
          <Button key={t.title} variant="outline" size="sm"
            className="justify-start h-auto py-2 px-2 text-xs border-white/10 hover:border-primary/40"
            onClick={() => apply(t)}>
            <span className="mr-1.5">{t.emoji}</span>
            <span className="truncate">{t.title}</span>
          </Button>
        ))}
      </div>
    </div>
  );
};