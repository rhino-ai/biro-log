import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';
import { SubjectType, subjectIcons } from '@/data/syllabus';

interface ProgressRadarProps {
  jungleId: string;
}

export const ProgressRadar = ({ jungleId }: ProgressRadarProps) => {
  const { jungles } = useGameStore();
  const jungle = jungles.find(j => j.id === jungleId);
  
  if (!jungle || jungle.chapters.length === 0) return null;

  // Calculate progress per subject dynamically
  const subjectProgress: Record<string, number> = {};
  const subjectCounts: Record<string, number> = {};

  jungle.chapters.forEach((chapter) => {
    let progress = 0;
    if (chapter.theoryDone) progress += 33;
    if (chapter.practiceDone) progress += 33;
    if (chapter.revisionDone) progress += 34;

    if (!subjectProgress[chapter.subject]) {
      subjectProgress[chapter.subject] = 0;
      subjectCounts[chapter.subject] = 0;
    }
    subjectProgress[chapter.subject] += progress;
    subjectCounts[chapter.subject] += 1;
  });

  // Get unique subjects with their averages
  const subjectAverages = Object.keys(subjectProgress).map(subject => ({
    subject: subject as SubjectType,
    name: subject.charAt(0).toUpperCase() + subject.slice(1).replace('_', ' '),
    icon: subjectIcons[subject as SubjectType] || '📚',
    avg: subjectCounts[subject] > 0 
      ? Math.round(subjectProgress[subject] / subjectCounts[subject]) 
      : 0,
  }));

  // If only one subject, show a simple bar
  if (subjectAverages.length === 1) {
    const sub = subjectAverages[0];
    return (
      <div className="glass-panel rounded-2xl p-4">
        <h3 className="text-sm font-medium mb-3 text-center">📊 Progress</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span>{sub.icon}</span>
              <span>{sub.name}</span>
            </span>
            <span className="text-accent font-medium">{sub.avg}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full transition-all duration-700"
              style={{ width: `${sub.avg}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // For multiple subjects, show bar chart
  return (
    <div className="glass-panel rounded-2xl p-4">
      <h3 className="text-sm font-medium mb-4 text-center">📊 Subject Progress</h3>
      <div className="space-y-3">
        {subjectAverages.map((sub) => (
          <div key={sub.subject} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <span>{sub.icon}</span>
                <span className="text-muted-foreground">{sub.name}</span>
              </span>
              <span className="text-accent font-medium">{sub.avg}%</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full transition-all duration-700"
                style={{ width: `${sub.avg}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Overall Average */}
      <div className="mt-4 pt-3 border-t border-white/10 text-center">
        <span className="text-xs text-muted-foreground">Overall: </span>
        <span className="font-game text-lg text-accent">
          {Math.round(subjectAverages.reduce((sum, s) => sum + s.avg, 0) / subjectAverages.length)}%
        </span>
      </div>
    </div>
  );
};
