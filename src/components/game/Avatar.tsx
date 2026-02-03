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

  const imageSizeClasses = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  const getMoodEmoji = () => {
    if (isSad) return '😰';
    if (isHappy) return '😎';
    return profile.avatar;
  };

  // Check if avatar is a URL (image) or emoji
  const isImageUrl = profile.avatar?.startsWith('http') || profile.avatar?.startsWith('data:');
  const displayContent = showMood && !isImageUrl ? getMoodEmoji() : profile.avatar;

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
            'rounded-full bg-card flex items-center justify-center overflow-hidden',
            sizeClasses[size]
          )}
        >
          {isImageUrl ? (
            <img
              src={profile.avatar}
              alt="Avatar"
              className={cn('w-full h-full object-cover', imageSizeClasses[size])}
              onError={(e) => {
                // Fallback to emoji if image fails
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = '👨‍🎓';
                }
              }}
            />
          ) : (
            <span>{displayContent}</span>
          )}
        </div>
      </div>
      {isHappy && !isSad && (
        <div className="absolute -bottom-1 -right-1 text-lg animate-bounce-subtle">
          ✨
        </div>
      )}
      {isSad && (
        <div className="absolute -bottom-1 -right-1 text-lg">
          😢
        </div>
      )}
    </div>
  );
};
