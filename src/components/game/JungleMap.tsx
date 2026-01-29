import { useGameStore } from '@/store/gameStore';
import { TreeIcon } from './TreeIcon';
import { cn } from '@/lib/utils';
import { JungleData } from '@/data/syllabus';

interface JungleMapProps {
  jungle: JungleData;
}

export const JungleMap = ({ jungle }: JungleMapProps) => {
  const { getTreeState, calculateJungleHealth } = useGameStore();
  const health = calculateJungleHealth(jungle.id);

  // Determine map theme based on health
  const getMapBackground = () => {
    if (health >= 80) return 'from-green-900/40 via-emerald-900/30 to-teal-900/40';
    if (health >= 50) return 'from-green-900/30 via-emerald-900/20 to-green-900/30';
    if (health >= 20) return 'from-yellow-900/20 via-amber-900/20 to-orange-900/20';
    return 'from-gray-900/30 via-stone-900/30 to-gray-900/30';
  };

  // Generate random but deterministic positions for trees
  const getTreePosition = (index: number, total: number) => {
    const row = Math.floor(index / 5);
    const col = index % 5;
    const offsetX = (Math.sin(index * 1.5) * 10);
    const offsetY = (Math.cos(index * 1.5) * 10);
    
    return {
      left: `${15 + col * 18 + offsetX}%`,
      top: `${20 + row * 25 + offsetY}%`,
    };
  };

  // Get animals based on health
  const getAnimals = () => {
    const animals = [];
    if (health >= 80) {
      animals.push({ emoji: '🦜', position: { left: '75%', top: '15%' }, animation: 'animate-float' });
      animals.push({ emoji: '🐒', position: { left: '20%', top: '30%' }, animation: 'animate-bounce-subtle' });
      animals.push({ emoji: '🦋', position: { left: '60%', top: '50%' }, animation: 'animate-float' });
    } else if (health >= 50) {
      animals.push({ emoji: '🦋', position: { left: '40%', top: '25%' }, animation: 'animate-float' });
      animals.push({ emoji: '🐦', position: { left: '70%', top: '35%' }, animation: 'animate-bounce-subtle' });
    } else if (health >= 20) {
      animals.push({ emoji: '🦎', position: { left: '30%', top: '60%' }, animation: '' });
    }
    return animals;
  };

  const animals = getAnimals();

  return (
    <div className="relative glass-panel rounded-2xl p-4 overflow-hidden">
      {/* Map Background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        getMapBackground()
      )} />

      {/* Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'linear-gradient(rgba(124, 58, 237, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(124, 58, 237, 0.3) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }}
      />

      {/* Map Header */}
      <div className="relative z-10 flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{jungle.icon}</span>
          <h3 className="font-game text-lg">{jungle.name} Map</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-sm">Health:</span>
          <span className={cn(
            "font-game",
            health >= 70 ? "text-accent" : health >= 40 ? "text-coins" : "text-destructive"
          )}>
            {health}%
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div className="relative h-72 rounded-xl border border-primary/20 overflow-hidden">
        {/* Ground */}
        <div className={cn(
          "absolute inset-0 transition-all duration-1000",
          health >= 70 ? "bg-gradient-to-b from-transparent via-green-900/20 to-green-800/30" :
          health >= 40 ? "bg-gradient-to-b from-transparent via-amber-900/20 to-amber-800/20" :
          "bg-gradient-to-b from-transparent via-stone-900/20 to-stone-800/30"
        )} />

        {/* Path */}
        <svg className="absolute inset-0 w-full h-full opacity-30">
          <path
            d="M 10 250 Q 100 200 200 220 T 400 180 T 550 230"
            fill="none"
            stroke="currentColor"
            className="text-primary"
            strokeWidth="3"
            strokeDasharray="10 5"
          />
        </svg>

        {/* Trees */}
        {jungle.chapters.slice(0, 15).map((chapter, index) => {
          const state = getTreeState(chapter);
          const pos = getTreePosition(index, jungle.chapters.length);
          
          return (
            <div
              key={chapter.id}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 hover:scale-125 cursor-pointer"
              style={pos}
              title={`${chapter.name} (${state})`}
            >
              <TreeIcon state={state} size="md" />
              {state === 'flourishing' && (
                <div className="absolute -top-2 -right-1 text-xs animate-bounce-subtle">
                  🍎
                </div>
              )}
            </div>
          );
        })}

        {/* Animals */}
        {animals.map((animal, index) => (
          <div
            key={index}
            className={cn("absolute text-2xl", animal.animation)}
            style={animal.position}
          >
            {animal.emoji}
          </div>
        ))}

        {/* Water Feature for healthy jungles */}
        {health >= 60 && (
          <div className="absolute bottom-4 right-4 text-3xl animate-pulse-glow">
            💧
          </div>
        )}

        {/* Decorative Elements */}
        {health >= 50 && (
          <>
            <div className="absolute top-6 left-4 text-lg opacity-60">🌸</div>
            <div className="absolute top-12 right-8 text-lg opacity-60">🌺</div>
          </>
        )}
      </div>

      {/* Legend */}
      <div className="relative z-10 flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span>🪵</span> Dry
        </div>
        <div className="flex items-center gap-1">
          <span>🌱</span> Growing
        </div>
        <div className="flex items-center gap-1">
          <span>🌳</span> Healthy
        </div>
        <div className="flex items-center gap-1">
          <span>🌴</span> Flourishing
        </div>
      </div>
    </div>
  );
};
