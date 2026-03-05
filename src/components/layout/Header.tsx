import { useGame } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/game/Avatar';
import { StreakBadge } from '@/components/game/StreakBadge';
import { Link, useNavigate } from 'react-router-dom';
import { Shield, Swords, Zap, LogOut, Book } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const Header = () => {
  const { coins, xp, level, backlogCount } = useGame();
  const { isAdmin, signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-white/10">
      <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Avatar size="sm" showMood />
              <div className="hidden sm:block text-left">
                <p className="text-xs text-muted-foreground">Level {level}</p>
                <p className="text-sm font-game text-primary">{xp} XP</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="glass-panel border-primary/20">
            <DropdownMenuItem onClick={() => navigate('/profile')}>
              👤 Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate('/guide')}>
              📖 Guide
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={() => navigate('/admin')}>
                🛡️ Admin Panel
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link to="/" className="font-game text-lg text-glow-purple flex items-center gap-1">
          <Zap className="w-4 h-4 text-accent" />
          <span className="hidden sm:inline">Biro-log</span>
          <Zap className="w-4 h-4 text-accent" />
        </Link>

        <div className="flex items-center gap-2">
          {/* Raid Alert */}
          {backlogCount > 0 && (
            <Link 
              to="/raid" 
              className="flex items-center gap-1 glass-panel px-2 py-1.5 rounded-full border border-raid/30 animate-pulse"
            >
              <Swords className="w-4 h-4 text-raid" />
              <span className="text-xs text-raid font-medium">{backlogCount}</span>
            </Link>
          )}
          
          <StreakBadge />
          
          <div className="flex items-center gap-1 glass-panel px-3 py-1.5 rounded-full">
            <span>🪙</span>
            <span className="font-game text-coins text-sm">{coins}</span>
          </div>

          {/* Guide Link */}
          <Link 
            to="/guide" 
            className="glass-panel p-1.5 rounded-full border border-accent/20 hover:border-accent/50 transition-colors"
          >
            <Book className="w-4 h-4 text-accent" />
          </Link>

          {/* Admin Link - Only for admins */}
          {isAdmin && (
            <Link 
              to="/admin" 
              className="glass-panel p-1.5 rounded-full border border-primary/20 hover:border-primary/50 transition-colors"
            >
              <Shield className="w-4 h-4 text-primary" />
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
