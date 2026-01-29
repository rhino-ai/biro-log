import { useState, useEffect } from 'react';

interface ExamCountdownProps {
  examName: string;
  examDate: Date;
  icon: string;
}

export const ExamCountdown = ({ examName, examDate, icon }: ExamCountdownProps) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const diff = examDate.getTime() - now.getTime();
      
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft({ days, hours, minutes });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, [examDate]);

  const isUrgent = timeLeft.days < 30;

  return (
    <div className={`glass-panel rounded-xl p-4 ${isUrgent ? 'border border-raid/30' : ''}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div className="flex-1">
          <h4 className="font-medium text-sm">{examName}</h4>
          <div className="flex items-baseline gap-1 mt-1">
            <span className={`font-game text-xl ${isUrgent ? 'text-raid' : 'text-accent'}`}>
              {timeLeft.days}
            </span>
            <span className="text-xs text-muted-foreground">days</span>
            <span className={`font-game text-lg ml-2 ${isUrgent ? 'text-raid/80' : 'text-accent/80'}`}>
              {timeLeft.hours}
            </span>
            <span className="text-xs text-muted-foreground">hrs</span>
          </div>
        </div>
        {isUrgent && <span className="text-xl animate-pulse-glow">⚠️</span>}
      </div>
    </div>
  );
};
