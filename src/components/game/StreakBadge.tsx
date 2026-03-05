import { useGame } from '@/hooks/useGame';
import { cn } from '@/lib/utils';

export const StreakBadge = () => {
  const { streak } = useGame();
  
  const hasFireAura = streak >= 3;
  const has2xXP = streak >= 7;

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 rounded-full glass-panel',
          hasFireAura && 'glow-gold'
        )}
      >
        <span className={cn('text-xl', hasFireAura && 'animate-fire')}>
          🔥
        </span>
        <span className="font-game text-coins font-bold">{streak}</span>
        {has2xXP && (
          <span className="text-xs bg-accent/20 text-accent px-1.5 py-0.5 rounded-full ml-1">
            2× XP
          </span>
        )}
      </div>
    </div>
  );
};
