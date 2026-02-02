import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, AlertTriangle, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PunishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  backlogCount: number;
}

// Punishment types with their descriptions and emojis
const punishments = [
  { 
    id: 'jumping', 
    emoji: '🦘', 
    name: 'Jumping Jacks', 
    description: 'Do 20 jumping jacks right now!',
    count: 20,
    unit: 'jumps'
  },
  { 
    id: 'exercise', 
    emoji: '💪', 
    name: 'Push-ups', 
    description: 'Drop and give me push-ups!',
    count: 10,
    unit: 'reps'
  },
  { 
    id: 'squats', 
    emoji: '🏋️', 
    name: 'Squats', 
    description: 'Time for some squats!',
    count: 15,
    unit: 'squats'
  },
  { 
    id: 'crying', 
    emoji: '😭', 
    name: 'Shame Corner', 
    description: 'Go stand in the corner and think about your incomplete tasks!',
    count: 1,
    unit: 'minute'
  },
  { 
    id: 'slapping', 
    emoji: '👋', 
    name: 'Wake Up Slaps', 
    description: 'Give yourself light face taps to wake up!',
    count: 5,
    unit: 'taps'
  },
  { 
    id: 'running', 
    emoji: '🏃', 
    name: 'Spot Running', 
    description: 'Run in place as fast as you can!',
    count: 30,
    unit: 'seconds'
  },
  { 
    id: 'planks', 
    emoji: '🧘', 
    name: 'Plank Hold', 
    description: 'Hold a plank position!',
    count: 30,
    unit: 'seconds'
  },
  { 
    id: 'burpees', 
    emoji: '🔥', 
    name: 'Burpees', 
    description: 'The ultimate punishment - burpees!',
    count: 5,
    unit: 'reps'
  },
];

export const PunishmentModal = ({ isOpen, onClose, backlogCount }: PunishmentModalProps) => {
  const [currentPunishment, setCurrentPunishment] = useState(punishments[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [completedPunishments, setCompletedPunishments] = useState<string[]>([]);

  // Select random punishment based on backlog severity
  useEffect(() => {
    if (isOpen) {
      const randomIndex = Math.floor(Math.random() * punishments.length);
      setCurrentPunishment(punishments[randomIndex]);
      setIsAnimating(true);
    }
  }, [isOpen]);

  // Increase punishment based on backlog count
  const multiplier = Math.min(backlogCount, 5);
  const adjustedCount = currentPunishment.count * multiplier;

  const handleCompletePunishment = () => {
    setCompletedPunishments([...completedPunishments, currentPunishment.id]);
    // Pick a new random punishment
    const remaining = punishments.filter(p => !completedPunishments.includes(p.id) && p.id !== currentPunishment.id);
    if (remaining.length > 0) {
      const randomIndex = Math.floor(Math.random() * remaining.length);
      setCurrentPunishment(remaining[randomIndex]);
    }
  };

  const handleSkipPunishment = () => {
    // Shame the user for skipping
    const remaining = punishments.filter(p => p.id !== currentPunishment.id);
    const randomIndex = Math.floor(Math.random() * remaining.length);
    setCurrentPunishment(remaining[randomIndex]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-10 -left-10 w-40 h-40 bg-destructive/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-raid/20 rounded-full blur-3xl animate-pulse" />
      </div>

      <div className={cn(
        "relative glass-panel border-destructive/50 rounded-xl p-6 max-w-md w-full",
        isAnimating && "animate-shake"
      )}>
        {/* Close Button */}
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </Button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
            <h2 className="font-game text-2xl text-destructive">BEIJJATI!</h2>
            <AlertTriangle className="w-6 h-6 text-destructive animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">
            You have {backlogCount} incomplete tasks. Time for punishment!
          </p>
        </div>

        {/* Punishment Display */}
        <div className="glass-panel rounded-xl p-6 border border-destructive/30 mb-6">
          <div className={cn(
            "text-6xl text-center mb-4",
            isAnimating && "animate-bounce"
          )}>
            {currentPunishment.emoji}
          </div>
          
          <h3 className="font-game text-xl text-center text-foreground mb-2">
            {currentPunishment.name}
          </h3>
          
          <p className="text-center text-muted-foreground mb-4">
            {currentPunishment.description}
          </p>

          {/* Punishment Counter */}
          <div className="flex items-center justify-center gap-2">
            <Flame className="w-5 h-5 text-destructive" />
            <span className="font-game text-3xl text-destructive">
              {adjustedCount}
            </span>
            <span className="text-muted-foreground">{currentPunishment.unit}</span>
          </div>
          
          {multiplier > 1 && (
            <p className="text-xs text-center text-destructive/70 mt-2">
              x{multiplier} multiplier for {backlogCount} backlogs!
            </p>
          )}
        </div>

        {/* Boss Threat */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2 animate-bounce-subtle">👹</div>
          <p className="text-sm text-raid italic">
            "Lazy student! Complete your tasks or face more punishments!"
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSkipPunishment}
            variant="outline"
            className="flex-1 border-muted-foreground/30"
          >
            😓 Skip (Shameful)
          </Button>
          <Button
            onClick={handleCompletePunishment}
            className="flex-1 bg-accent hover:bg-accent/80 gap-2"
          >
            ✅ Done!
          </Button>
        </div>

        {/* Completed Count */}
        {completedPunishments.length > 0 && (
          <p className="text-center text-xs text-accent mt-4">
            🏆 {completedPunishments.length} punishments completed!
          </p>
        )}

        {/* Motivational Text */}
        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <p className="text-xs text-center text-muted-foreground">
            💡 Tip: Complete your tasks on time to avoid punishments!
            <br />
            Go to Raid Arena to clear your backlogs!
          </p>
        </div>
      </div>
    </div>
  );
};
