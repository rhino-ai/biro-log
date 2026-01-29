import { useGameStore } from '@/store/gameStore';

export const XPBar = () => {
  const { xp, level } = useGameStore();
  const xpInCurrentLevel = xp % 100;
  const progressPercent = xpInCurrentLevel;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted-foreground">Level {level}</span>
        <span className="text-xs text-accent font-medium">{xpInCurrentLevel}/100 XP</span>
      </div>
      <div className="h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-accent rounded-full progress-glow transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
