import { useGameStore } from '@/store/gameStore';
import { Avatar } from '@/components/game/Avatar';
import { StreakBadge } from '@/components/game/StreakBadge';
import { Link } from 'react-router-dom';

export const Header = () => {
  const { coins, xp, level } = useGameStore();

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <Link to="/profile" className="flex items-center gap-3">
          <Avatar size="sm" showMood />
          <div className="hidden sm:block">
            <p className="text-xs text-muted-foreground">Level {level}</p>
            <p className="text-sm font-game text-primary">{xp} XP</p>
          </div>
        </Link>

        <h1 className="font-game text-lg text-glow-purple hidden sm:block">
          Jungle Study
        </h1>

        <div className="flex items-center gap-3">
          <StreakBadge />
          <div className="flex items-center gap-1 glass-panel px-3 py-1.5 rounded-full">
            <span>🪙</span>
            <span className="font-game text-coins text-sm">{coins}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
