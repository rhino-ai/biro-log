import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface ProgressRadarProps {
  jungleId: string;
}

export const ProgressRadar = ({ jungleId }: ProgressRadarProps) => {
  const { jungles } = useGameStore();
  const jungle = jungles.find(j => j.id === jungleId);
  
  if (!jungle) return null;

  // Calculate progress per subject
  const subjectProgress = {
    mathematics: 0,
    physics: 0,
    chemistry: 0,
    oChem: 0, // Organic Chemistry
    iChem: 0, // Inorganic Chemistry
    pChem: 0, // Physical Chemistry
  };

  const subjectCounts = {
    mathematics: 0,
    physics: 0,
    chemistry: 0,
  };

  jungle.chapters.forEach((chapter) => {
    let progress = 0;
    if (chapter.theoryDone) progress += 33;
    if (chapter.practiceDone) progress += 33;
    if (chapter.revisionDone) progress += 34;

    subjectProgress[chapter.subject] += progress;
    subjectCounts[chapter.subject] += 1;
  });

  // Calculate averages
  const mathsAvg = subjectCounts.mathematics > 0 
    ? Math.round(subjectProgress.mathematics / subjectCounts.mathematics) 
    : 0;
  const physicsAvg = subjectCounts.physics > 0 
    ? Math.round(subjectProgress.physics / subjectCounts.physics) 
    : 0;
  const chemAvg = subjectCounts.chemistry > 0 
    ? Math.round(subjectProgress.chemistry / subjectCounts.chemistry) 
    : 0;

  // Radar chart calculations
  const centerX = 100;
  const centerY = 100;
  const maxRadius = 70;
  const subjects = [
    { name: 'Maths', value: mathsAvg, angle: -90 },
    { name: 'Physics', value: physicsAvg, angle: 30 },
    { name: 'P. Chem', value: chemAvg * 0.4, angle: 90 },
    { name: 'I. Chem', value: chemAvg * 0.3, angle: 150 },
    { name: 'O. Chem', value: chemAvg * 0.3, angle: 210 },
  ];

  // Calculate polygon points
  const getPoint = (value: number, angleDeg: number) => {
    const radius = (value / 100) * maxRadius;
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleRad),
      y: centerY + radius * Math.sin(angleRad),
    };
  };

  const dataPoints = subjects.map(s => getPoint(s.value, s.angle));
  const polygonPath = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="glass-panel rounded-2xl p-4">
      <div className="relative">
        <svg viewBox="0 0 200 200" className="w-full max-w-[250px] mx-auto">
          {/* Grid Circles */}
          {gridLevels.map((level, i) => (
            <polygon
              key={i}
              points={subjects.map(s => {
                const p = getPoint(level, s.angle);
                return `${p.x},${p.y}`;
              }).join(' ')}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeOpacity={0.2}
              strokeWidth="1"
            />
          ))}

          {/* Axis Lines */}
          {subjects.map((s, i) => {
            const endPoint = getPoint(100, s.angle);
            return (
              <line
                key={i}
                x1={centerX}
                y1={centerY}
                x2={endPoint.x}
                y2={endPoint.y}
                stroke="hsl(var(--primary))"
                strokeOpacity={0.3}
                strokeWidth="1"
              />
            );
          })}

          {/* Data Polygon */}
          <path
            d={polygonPath}
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />

          {/* Data Points */}
          {dataPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="4"
              fill="hsl(var(--primary))"
              className="glow-purple"
            />
          ))}

          {/* Labels */}
          {subjects.map((s, i) => {
            const labelPoint = getPoint(120, s.angle);
            return (
              <text
                key={i}
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-muted-foreground text-[10px]"
              >
                {s.name}
              </text>
            );
          })}

          {/* Center Value */}
          <text
            x={centerX}
            y={centerY - 8}
            textAnchor="middle"
            className="fill-primary font-game text-[12px]"
          >
            {Math.round((mathsAvg + physicsAvg + chemAvg) / 3)}
          </text>
        </svg>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 mt-4 text-xs">
          <div className="text-center">
            <div className="text-accent font-medium">{mathsAvg}%</div>
            <div className="text-muted-foreground">Maths</div>
          </div>
          <div className="text-center">
            <div className="text-accent font-medium">{physicsAvg}%</div>
            <div className="text-muted-foreground">Physics</div>
          </div>
          <div className="text-center">
            <div className="text-accent font-medium">{chemAvg}%</div>
            <div className="text-muted-foreground">Chemistry</div>
          </div>
        </div>
      </div>
    </div>
  );
};
