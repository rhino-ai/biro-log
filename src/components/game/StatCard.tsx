import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: string;
  value: string | number;
  label: string;
  color: 'purple' | 'green' | 'gold' | 'red' | 'blue';
  glow?: boolean;
  animate?: boolean;
}

const colorClasses = {
  purple: 'text-primary',
  green: 'text-accent',
  gold: 'text-coins',
  red: 'text-raid',
  blue: 'text-blue-400',
};

const glowClasses = {
  purple: 'glow-purple',
  green: 'glow-green',
  gold: 'glow-gold',
  red: 'shadow-[0_0_20px_hsl(0,84%,60%,0.4)]',
  blue: 'shadow-[0_0_20px_hsl(210,100%,60%,0.4)]',
};

export const StatCard = ({ icon, value, label, color, glow = false, animate = false }: StatCardProps) => {
  return (
    <div
      className={cn(
        'stat-card min-w-[80px]',
        glow && glowClasses[color]
      )}
    >
      <span className={cn('text-2xl', animate && 'animate-bounce-subtle')}>{icon}</span>
      <span className={cn('text-xl font-bold font-game', colorClasses[color])}>
        {value}
      </span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">{label}</span>
    </div>
  );
};
