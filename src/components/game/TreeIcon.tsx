import { cn } from '@/lib/utils';

interface TreeIconProps {
  state: 'dry' | 'growing' | 'healthy' | 'flourishing';
  size?: 'sm' | 'md' | 'lg';
}

const stateEmojis = {
  dry: '🪵',
  growing: '🌱',
  healthy: '🌳',
  flourishing: '🌴',
};

const stateClasses = {
  dry: 'tree-dry',
  growing: 'tree-growing',
  healthy: 'tree-healthy',
  flourishing: 'tree-flourishing',
};

const sizeClasses = {
  sm: 'text-xl',
  md: 'text-3xl',
  lg: 'text-5xl',
};

export const TreeIcon = ({ state, size = 'md' }: TreeIconProps) => {
  return (
    <div className={cn('relative inline-flex items-center justify-center', stateClasses[state])}>
      <span className={cn(sizeClasses[size])}>
        {stateEmojis[state]}
      </span>
      {state === 'flourishing' && (
        <>
          <span className="absolute -top-2 -right-1 text-sm animate-bounce-subtle">🐦</span>
          <span className="absolute -bottom-1 -left-1 text-sm animate-float">🍎</span>
        </>
      )}
      {state === 'healthy' && (
        <span className="absolute -top-1 right-0 text-xs">🐿️</span>
      )}
    </div>
  );
};
