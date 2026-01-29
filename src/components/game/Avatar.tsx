import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface AvatarProps {
  size?: 'sm' | 'md' | 'lg';
  showMood?: boolean;
}

export const Avatar = ({ size = 'md', showMood = true }: AvatarProps) => {
  const { profile, backlogCount, streak, level } = useGameStore();
  
  const isHappy = streak >= 3 && backlogCount === 0;
  const isSad = backlogCount > 5;
  const hasGlow = level >= 10;
  const hasCrown = level >= 20;

  const sizeClasses = {
    sm: 'w-10 h-10 text-xl',
    md: 'w-16 h-16 text-3xl',
    lg: 'w-24 h-24 text-5xl',
  };

  const getMoodEmoji = () => {
    if (isSad) return '😰';
    if (isHappy) return '😎';
    return profile.avatar;
  };

  return (
    <div className="relative inline-flex flex-col items-center">
      {hasCrown && (
        <span className="absolute -top-4 text-2xl animate-bounce-subtle z-10">👑</span>
      )}
      <div
        className={cn(
          'avatar-ring',
          hasGlow && 'avatar-ring-gold',
          isSad && 'opacity-70 grayscale-[30%]'
        )}
      >
        <div
          className={cn(
            'rounded-full bg-card flex items-center justify-center',
            sizeClasses[size]
          )}
        >
          {showMood ? getMoodEmoji() : profile.avatar}
        </div>
      </div>
      {isHappy && (
        <div className="absolute -bottom-1 -right-1 text-lg animate-bounce-subtle">
          ✨
        </div>
      )}
    </div>
  );
};
