import { useState } from 'react';
import { useGame } from '@/hooks/useGame';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Calendar, Edit2, Save, X } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export const ExamDateEditor = () => {
  const { examDates, updateExamDates } = useGame();
  const [isEditing, setIsEditing] = useState(false);
  const [editedDates, setEditedDates] = useState(examDates);

  const handleSave = () => {
    updateExamDates(editedDates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedDates(examDates);
    setIsEditing(false);
  };

  const getDaysRemaining = (dateStr: string) => {
    const targetDate = new Date(dateStr);
    const today = new Date();
    return differenceInDays(targetDate, today);
  };

  const exams = [
    { key: 'jeeMain' as const, icon: '📗', name: 'JEE Main', color: 'from-green-500 to-emerald-500' },
    { key: 'cbse' as const, icon: '📘', name: 'CBSE Boards', color: 'from-blue-500 to-cyan-500' },
    { key: 'jeeAdvanced' as const, icon: '📕', name: 'JEE Advanced', color: 'from-red-500 to-orange-500' },
  ];

  return (
    <div className="glass-panel rounded-2xl p-5 border border-primary/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          <h3 className="font-game text-lg text-primary">Exam Dates</h3>
        </div>
        {isEditing ? (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              <X className="w-4 h-4" />
            </Button>
            <Button size="sm" onClick={handleSave} className="bg-accent">
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {exams.map((exam) => {
          const dateStr = isEditing ? editedDates[exam.key] : examDates[exam.key];
          const daysLeft = getDaysRemaining(dateStr);
          const isUrgent = daysLeft <= 30;
          const isVeryUrgent = daysLeft <= 7;

          return (
            <div
              key={exam.key}
              className={cn(
                "glass-panel rounded-xl p-4 border transition-all",
                isVeryUrgent ? "border-raid/50 bg-raid/5" :
                isUrgent ? "border-coins/50 bg-coins/5" :
                "border-white/10"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{exam.icon}</span>
                  <div>
                    <p className="font-medium text-sm">{exam.name}</p>
                    {isEditing ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="mt-1 h-7 text-xs">
                            {format(new Date(editedDates[exam.key]), 'PPP')}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <CalendarComponent
                            mode="single"
                            selected={new Date(editedDates[exam.key])}
                            onSelect={(date) => date && setEditedDates({
                              ...editedDates,
                              [exam.key]: format(date, 'yyyy-MM-dd')
                            })}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(dateStr), 'MMMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
                <div className={cn(
                  "text-right",
                  isVeryUrgent ? "text-raid animate-pulse" :
                  isUrgent ? "text-coins" :
                  "text-accent"
                )}>
                  <p className="font-game text-2xl">{Math.max(0, daysLeft)}</p>
                  <p className="text-xs">days left</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
