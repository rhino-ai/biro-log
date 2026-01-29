import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/', icon: '🏠', label: 'Home' },
  { path: '/jungles', icon: '🌴', label: 'Jungles' },
  { path: '/raid', icon: '⚔️', label: 'Raid' },
  { path: '/tasks', icon: '✅', label: 'Tasks' },
  { path: '/profile', icon: '👤', label: 'Profile' },
];

export const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-white/10 pb-safe">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-300',
                isActive
                  ? 'text-primary glow-purple scale-110'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
