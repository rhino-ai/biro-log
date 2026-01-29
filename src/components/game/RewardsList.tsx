import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

export const RewardsList = () => {
  const { getUnlockedRewards, level } = useGameStore();
  const rewards = getUnlockedRewards();

  return (
    <div className="space-y-3">
      <h3 className="font-game text-lg mb-4">🎁 Rewards</h3>
      <div className="grid grid-cols-3 gap-3">
        {rewards.map((reward) => (
          <div
            key={reward.level}
            className={cn(
              'glass-panel rounded-xl p-3 text-center transition-all duration-300',
              reward.unlocked ? 'glow-gold' : 'opacity-50 grayscale'
            )}
          >
            <span className={cn('text-3xl', reward.unlocked && 'animate-bounce-subtle')}>
              {reward.icon}
            </span>
            <p className="text-xs mt-2 font-medium">{reward.name}</p>
            <p className={cn(
              'text-xs mt-1',
              reward.unlocked ? 'text-coins' : 'text-muted-foreground'
            )}>
              Lv. {reward.level}
            </p>
            {reward.unlocked && (
              <span className="text-xs text-accent">✓ Unlocked!</span>
            )}
          </div>
        ))}
      </div>
      {level < 30 && (
        <p className="text-xs text-center text-muted-foreground mt-4">
          Next reward at Level {rewards.find(r => !r.unlocked)?.level || 30}
        </p>
      )}
    </div>
  );
};
