import { useGameStore } from '@/store/gameStore';
import { Avatar } from '@/components/game/Avatar';
import { StreakBadge } from '@/components/game/StreakBadge';
import { Link } from 'react-router-dom';
import { Shield, Swords } from 'lucide-react';

export const Header = () => {
  const { coins, xp, level, backlogCount } = useGameStore();

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

        <Link to="/" className="font-game text-lg text-glow-purple hidden sm:block">
          Jungle Study
        </Link>

        <div className="flex items-center gap-2">
          {/* Raid Alert */}
          {backlogCount > 0 && (
            <Link 
              to="/raid" 
              className="flex items-center gap-1 glass-panel px-2 py-1.5 rounded-full border border-destructive/30 animate-pulse"
            >
              <Swords className="w-4 h-4 text-destructive" />
              <span className="text-xs text-destructive font-medium">{backlogCount}</span>
            </Link>
          )}
          
          <StreakBadge />
          
          <div className="flex items-center gap-1 glass-panel px-3 py-1.5 rounded-full">
            <span>🪙</span>
            <span className="font-game text-coins text-sm">{coins}</span>
          </div>

          {/* Admin Link */}
          <Link 
            to="/admin" 
            className="glass-panel p-1.5 rounded-full border border-primary/20 hover:border-primary/50 transition-colors"
          >
            <Shield className="w-4 h-4 text-primary" />
          </Link>
        </div>
      </div>
    </header>
  );
};
