import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useGameStore } from '@/store/gameStore';

const navItems = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/jungles', icon: '🌴', label: 'Jungles' },
  { path: '/raid', icon: '⚔️', label: 'Raid' },
  { path: '/tasks', icon: '✅', label: 'Tasks' },
  { path: '/guide', icon: '📖', label: 'Guide' },
];

export const BottomNav = () => {
  const location = useLocation();
  const { backlogCount } = useGameStore();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const isRaid = item.path === '/raid';
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300 relative',
                isActive
                  ? 'text-primary glow-purple scale-110'
                  : 'text-muted-foreground hover:text-foreground',
                isRaid && backlogCount > 0 && 'text-raid animate-pulse'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span>
              
              {/* Raid badge */}
              {isRaid && backlogCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-raid text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {backlogCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
