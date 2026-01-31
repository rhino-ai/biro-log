import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { BookOpen, Calculator, Beaker, Edit2, Save, Plus, Minus } from 'lucide-react';

interface DailyGoalWidgetProps {
  className?: string;
}

const subjectIcons = {
  physics: { icon: '⚡', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  chemistry: { icon: '🧪', color: 'text-green-400', bg: 'bg-green-500/20' },
  mathematics: { icon: '📐', color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
};

export const DailyGoalWidget = ({ className }: DailyGoalWidgetProps) => {
  const { xp } = useGameStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [dailyGoals, setDailyGoals] = useState({
    questions: { target: 20, completed: 0 },
    theory: { target: 3, completed: 0 }, // hours
    revision: { target: 2, completed: 0 }, // chapters
  });
  
  const [subjectProgress, setSubjectProgress] = useState({
    physics: 0,
    chemistry: 0,
    mathematics: 0,
  });

  const handleIncrement = (subject: keyof typeof subjectProgress) => {
    setSubjectProgress(prev => ({
      ...prev,
      [subject]: Math.min(prev[subject] + 1, 100),
    }));
  };

  const handleDecrement = (subject: keyof typeof subjectProgress) => {
    setSubjectProgress(prev => ({
      ...prev,
      [subject]: Math.max(prev[subject] - 1, 0),
    }));
  };

  const totalQuestions = Object.values(subjectProgress).reduce((a, b) => a + b, 0);
  const progressPercent = Math.min((totalQuestions / dailyGoals.questions.target) * 100, 100);

  return (
    <div className={cn("glass-panel rounded-2xl border border-primary/20 overflow-hidden", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-primary/20">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <div>
            <h3 className="font-game text-sm text-primary">Your Daily Goal</h3>
            <p className="text-xs text-muted-foreground">
              ({totalQuestions}/{dailyGoals.questions.target} Qs)
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? <Save className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="px-4 pt-4">
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-accent/50 via-accent to-accent/80 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs text-muted-foreground">Progress</span>
          <span className="text-xs text-accent font-medium">{Math.round(progressPercent)}%</span>
        </div>
      </div>

      {/* Subject Icons */}
      <div className="flex justify-around p-4">
        {Object.entries(subjectIcons).map(([subject, { icon, color, bg }]) => (
          <div key={subject} className="flex flex-col items-center gap-1">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center text-2xl", bg)}>
              {icon}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleDecrement(subject as keyof typeof subjectProgress)}
              >
                <Minus className="w-3 h-3" />
              </Button>
              <span className={cn("font-game text-sm", color)}>
                {subjectProgress[subject as keyof typeof subjectProgress]}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleIncrement(subject as keyof typeof subjectProgress)}
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Mode */}
      {isEditing && (
        <div className="px-4 pb-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Questions/Day</label>
              <Input
                type="number"
                value={dailyGoals.questions.target}
                onChange={(e) => setDailyGoals({
                  ...dailyGoals,
                  questions: { ...dailyGoals.questions, target: parseInt(e.target.value) || 0 }
                })}
                className="h-8 text-center bg-secondary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Theory (hrs)</label>
              <Input
                type="number"
                value={dailyGoals.theory.target}
                onChange={(e) => setDailyGoals({
                  ...dailyGoals,
                  theory: { ...dailyGoals.theory, target: parseInt(e.target.value) || 0 }
                })}
                className="h-8 text-center bg-secondary/50"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Revision (ch)</label>
              <Input
                type="number"
                value={dailyGoals.revision.target}
                onChange={(e) => setDailyGoals({
                  ...dailyGoals,
                  revision: { ...dailyGoals.revision, target: parseInt(e.target.value) || 0 }
                })}
                className="h-8 text-center bg-secondary/50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Points */}
      <div className="flex items-center justify-center gap-2 pb-4">
        <span className="text-sm text-muted-foreground">Points Earned Today:</span>
        <span className="font-game text-coins">{xp}</span>
        <span className="text-coins">🪙</span>
      </div>
    </div>
  );
};
