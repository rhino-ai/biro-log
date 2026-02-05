import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { StudyTrack, getJunglesByTrack, teacherSubjects, otherProfiles, OtherCategory } from '@/data/syllabus';
import { GraduationCap, Stethoscope, School, BookOpen, Briefcase, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface TrackOption {
  id: StudyTrack;
  name: string;
  description: string;
  icon: React.ReactNode;
  emoji: string;
  color: string;
}

const trackOptions: TrackOption[] = [
  {
    id: 'jee',
    name: 'JEE',
    description: 'Engineering (PCM)',
    icon: <GraduationCap className="w-8 h-8" />,
    emoji: '🎯',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'neet',
    name: 'NEET',
    description: 'Medical (PCB)',
    icon: <Stethoscope className="w-8 h-8" />,
    emoji: '🩺',
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'highschool',
    name: 'High School',
    description: 'All Subjects',
    icon: <School className="w-8 h-8" />,
    emoji: '📚',
    color: 'from-orange-500 to-amber-500',
  },
  {
    id: 'teacher',
    name: 'Teacher',
    description: 'Choose Subjects',
    icon: <BookOpen className="w-8 h-8" />,
    emoji: '👨‍🏫',
    color: 'from-purple-500 to-violet-500',
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Professional/Personal',
    icon: <Briefcase className="w-8 h-8" />,
    emoji: '💼',
    color: 'from-pink-500 to-rose-500',
  },
];

interface TrackSelectionProps {
  onComplete?: () => void;
}

export const TrackSelection = ({ onComplete }: TrackSelectionProps = {}) => {
  const { setStudyTrack, setJungles, setHasSelectedTrack, setTeacherSubjects, setOtherCategory } = useGameStore();
  const [selectedTrack, setSelectedTrack] = useState<StudyTrack | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedOtherCategory, setSelectedOtherCategory] = useState<OtherCategory | null>(null);
  const [step, setStep] = useState<'track' | 'teacher-subjects' | 'other-category'>('track');

  const handleTrackSelect = (track: StudyTrack) => {
    setSelectedTrack(track);
    if (track === 'teacher') {
      setStep('teacher-subjects');
    } else if (track === 'other') {
      setStep('other-category');
    }
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(s => s !== subjectId);
      }
      if (prev.length >= 5) {
        return prev; // Max 5 subjects
      }
      return [...prev, subjectId];
    });
  };

  const handleConfirm = () => {
    if (!selectedTrack) return;

    if (selectedTrack === 'teacher') {
      if (selectedSubjects.length === 0) return;
      setTeacherSubjects(selectedSubjects);
    } else if (selectedTrack === 'other') {
      if (!selectedOtherCategory) return;
      setOtherCategory(selectedOtherCategory);
    }

    const jungles = getJunglesByTrack(selectedTrack);
    setStudyTrack(selectedTrack);
    setJungles(JSON.parse(JSON.stringify(jungles)));
    setHasSelectedTrack(true);
    
    if (onComplete) {
      onComplete();
    }
  };

  const canConfirm = () => {
    if (!selectedTrack) return false;
    if (selectedTrack === 'teacher' && selectedSubjects.length === 0) return false;
    if (selectedTrack === 'other' && !selectedOtherCategory) return false;
    return true;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="font-game text-3xl text-glow-purple">🌴 Biro-log</h1>
          <p className="text-muted-foreground text-sm">
            {step === 'track' && "Apna track chuno!"}
            {step === 'teacher-subjects' && "Subjects chuno (Max 5)"}
            {step === 'other-category' && "Apna category chuno!"}
          </p>
        </div>

        {/* Track Selection */}
        {step === 'track' && (
          <div className="grid gap-3">
            {trackOptions.map((track) => (
              <button
                key={track.id}
                onClick={() => handleTrackSelect(track.id)}
                className={cn(
                  'glass-panel rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 border-2',
                  selectedTrack === track.id
                    ? 'border-accent bg-accent/20 scale-[1.02]'
                    : 'border-transparent hover:border-primary/30'
                )}
              >
                <div className={cn(
                  'w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-br',
                  track.color
                )}>
                  <span className="text-3xl">{track.emoji}</span>
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-game text-lg">{track.name}</h3>
                  <p className="text-sm text-muted-foreground">{track.description}</p>
                </div>
                {selectedTrack === track.id && (
                  <Check className="w-6 h-6 text-accent" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Teacher Subject Selection */}
        {step === 'teacher-subjects' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={() => setStep('track')}>
                ← Back
              </Button>
              <span className="text-sm text-muted-foreground">
                {selectedSubjects.length}/5 selected
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {teacherSubjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => handleSubjectToggle(subject.id)}
                  disabled={selectedSubjects.length >= 5 && !selectedSubjects.includes(subject.id)}
                  className={cn(
                    'glass-panel rounded-xl p-3 flex items-center gap-2 transition-all border-2',
                    selectedSubjects.includes(subject.id)
                      ? 'border-accent bg-accent/20'
                      : 'border-transparent hover:border-primary/30',
                    selectedSubjects.length >= 5 && !selectedSubjects.includes(subject.id) && 'opacity-50'
                  )}
                >
                  <span className="text-xl">{subject.icon}</span>
                  <span className="text-sm font-medium">{subject.name}</span>
                  {selectedSubjects.includes(subject.id) && (
                    <Check className="w-4 h-4 text-accent ml-auto" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Other Category Selection */}
        {step === 'other-category' && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" onClick={() => setStep('track')}>
              ← Back
            </Button>
            <div className="grid gap-3">
              {otherProfiles.map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setSelectedOtherCategory(profile.id)}
                  className={cn(
                    'glass-panel rounded-xl p-4 flex items-center gap-3 transition-all border-2',
                    selectedOtherCategory === profile.id
                      ? 'border-accent bg-accent/20'
                      : 'border-transparent hover:border-primary/30'
                  )}
                >
                  <div className={cn(
                    'w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br',
                    profile.color
                  )}>
                    <span className="text-2xl">{profile.icon}</span>
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-medium">{profile.name}</h3>
                    <p className="text-xs text-muted-foreground">{profile.description}</p>
                  </div>
                  {selectedOtherCategory === profile.id && (
                    <Check className="w-5 h-5 text-accent" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Confirm Button */}
        {(selectedTrack && (selectedTrack !== 'teacher' && selectedTrack !== 'other')) || 
         (step === 'teacher-subjects' && selectedSubjects.length > 0) ||
         (step === 'other-category' && selectedOtherCategory) ? (
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm()}
            className="w-full py-6 font-game text-lg bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-opacity"
          >
            Shuru Karo! 🚀
          </Button>
        ) : null}
      </div>
    </div>
  );
};