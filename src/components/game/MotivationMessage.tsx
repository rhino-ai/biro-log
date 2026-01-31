import { useEffect, useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { X, AlertTriangle, Heart, Target, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MotivationMessageProps {
  onClose?: () => void;
}

const encouragingMessages = [
  "You're doing great! 🌟 Keep pushing towards {dreamCollege}!",
  "Every question brings you closer to {dreamMarks} marks! 💪",
  "Your willpower is stronger than any backlog! 🔥",
  "{dreamCollege} is waiting for warriors like you! ⚔️",
  "Today's effort = Tomorrow's success at {dreamCollege}! 🎯",
  "You've got this! {dreamMarks} marks is achievable! 💫",
  "Champions train when others rest. Keep going! 🏆",
  "Your jungle is growing! Don't stop now! 🌴",
];

const pressureMessages = [
  "⚠️ {backlogCount} tasks overdue! Your dream of {dreamCollege} needs action NOW!",
  "🚨 ALERT: Backlog increasing! {dreamMarks} marks won't come from procrastination!",
  "😰 Your jungle is dying! {dreamCollege} dreams fading... ACT NOW!",
  "⏰ Time is running out! Clear your backlogs to reach {dreamMarks} marks!",
  "👹 The backlog boss grows stronger! Your {dreamCollege} goal is at risk!",
  "🔥 Your streak is broken! {dreamCollege} requires consistency!",
  "📉 Progress declining! Remember why you want {dreamMarks} marks!",
];

export const MotivationMessage = ({ onClose }: MotivationMessageProps) => {
  const { profile, backlogCount, streak, getOverdueTasks } = useGameStore();
  const [isVisible, setIsVisible] = useState(true);
  const [message, setMessage] = useState('');
  const [isPressure, setIsPressure] = useState(false);

  useEffect(() => {
    const overdueTasks = getOverdueTasks();
    const shouldPressure = backlogCount > 0 || overdueTasks.length > 0 || streak === 0;
    
    setIsPressure(shouldPressure);
    
    const messages = shouldPressure ? pressureMessages : encouragingMessages;
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    // Replace placeholders
    const formattedMessage = randomMessage
      .replace('{dreamCollege}', profile.dreamCollege)
      .replace('{dreamMarks}', profile.dreamMarks.jeeMain.toString())
      .replace('{backlogCount}', backlogCount.toString());
    
    setMessage(formattedMessage);
  }, [profile, backlogCount, streak, getOverdueTasks]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <div className={cn(
      "glass-panel rounded-2xl p-4 border animate-fade-in",
      isPressure 
        ? "border-raid/50 bg-raid/10" 
        : "border-accent/50 bg-accent/10"
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center text-xl",
          isPressure ? "bg-raid/20 animate-pulse" : "bg-accent/20"
        )}>
          {isPressure ? '😰' : '💪'}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            {isPressure ? (
              <AlertTriangle className="w-4 h-4 text-raid" />
            ) : (
              <Heart className="w-4 h-4 text-accent" />
            )}
            <span className={cn(
              "text-sm font-game",
              isPressure ? "text-raid" : "text-accent"
            )}>
              {isPressure ? "WAKE UP!" : "MOTIVATION"}
            </span>
          </div>
          <p className="text-sm text-foreground">{message}</p>
          
          {/* Action hints */}
          <div className="flex items-center gap-2 mt-2">
            {isPressure ? (
              <>
                <Target className="w-3 h-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Clear backlogs → Attack raid boss → Save your dream!
                </span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 text-accent" />
                <span className="text-xs text-muted-foreground">
                  Keep the momentum going!
                </span>
              </>
            )}
          </div>
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="shrink-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
