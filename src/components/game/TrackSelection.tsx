import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StudyTrack, getJunglesByTrack } from '@/data/syllabus';
import { Zap, GraduationCap, Stethoscope, School } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface TrackOption {
  id: StudyTrack;
  name: string;
  icon: React.ReactNode;
  description: string;
  subjects: string[];
  color: string;
}

const trackOptions: TrackOption[] = [
  {
    id: 'jee',
    name: 'JEE (Engineering)',
    icon: <GraduationCap className="w-8 h-8" />,
    description: 'For IIT-JEE, NIT, and engineering aspirants',
    subjects: ['Physics', 'Chemistry', 'Mathematics'],
    color: 'from-blue-500 to-purple-500',
  },
  {
    id: 'neet',
    name: 'NEET (Medical)',
    icon: <Stethoscope className="w-8 h-8" />,
    description: 'For medical and dental aspirants',
    subjects: ['Physics', 'Chemistry', 'Biology'],
    color: 'from-green-500 to-emerald-500',
  },
  {
    id: 'highschool',
    name: 'High School',
    icon: <School className="w-8 h-8" />,
    description: 'For classes 9-10 and general studies',
    subjects: ['Science', 'Maths', 'English', 'Hindi', 'SST', 'Computer'],
    color: 'from-orange-500 to-amber-500',
  },
];

interface TrackSelectionProps {
  onComplete: () => void;
}

export const TrackSelection = ({ onComplete }: TrackSelectionProps) => {
  const navigate = useNavigate();
  const { setStudyTrack, setJungles } = useGameStore();
  const [selectedTrack, setSelectedTrack] = useState<StudyTrack | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSelectTrack = (track: StudyTrack) => {
    setSelectedTrack(track);
  };

  const handleConfirm = async () => {
    if (!selectedTrack) return;
    
    setIsLoading(true);
    
    try {
      // Get jungles for the selected track
      const jungles = getJunglesByTrack(selectedTrack);
      
      // Update the store
      setStudyTrack(selectedTrack);
      setJungles(JSON.parse(JSON.stringify(jungles)));
      
      toast({
        title: '🎉 Track Selected!',
        description: `Welcome to ${trackOptions.find(t => t.id === selectedTrack)?.name}!`,
      });
      
      onComplete();
      navigate('/');
    } catch (error) {
      console.error('Error setting track:', error);
      toast({
        title: 'Error',
        description: 'Failed to set study track. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2 animate-fade-in">
          <img 
            src="/logo.png" 
            alt="Biro-log" 
            className="w-20 h-20 mx-auto rounded-xl shadow-lg"
          />
          <h1 className="font-game text-3xl text-glow-purple flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-accent animate-pulse" />
            Biro-log
            <Zap className="w-8 h-8 text-accent animate-pulse" />
          </h1>
          <p className="text-muted-foreground italic">
            "Tanik padho, Tanik Badho 🫠"
          </p>
        </div>

        <Card className="glass-panel border-primary/30 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="text-center">
            <CardTitle className="font-game text-xl text-primary">Choose Your Path</CardTitle>
            <CardDescription>
              Select your study track to begin your journey
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Track Options */}
            <div className="grid gap-4">
              {trackOptions.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleSelectTrack(track.id)}
                  className={cn(
                    'w-full p-4 rounded-xl border-2 transition-all duration-300 text-left',
                    'hover:scale-[1.02] hover:shadow-lg',
                    selectedTrack === track.id
                      ? 'border-primary bg-primary/10 shadow-lg'
                      : 'border-secondary bg-secondary/20 hover:border-primary/50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'p-3 rounded-xl bg-gradient-to-br text-white',
                      track.color
                    )}>
                      {track.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-game text-lg">{track.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{track.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {track.subjects.map((subject) => (
                          <span
                            key={subject}
                            className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground"
                          >
                            {subject}
                          </span>
                        ))}
                      </div>
                    </div>
                    {selectedTrack === track.id && (
                      <span className="text-2xl animate-bounce-subtle">✅</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Confirm Button */}
            <Button
              className="w-full bg-primary glow-purple mt-4"
              size="lg"
              disabled={!selectedTrack || isLoading}
              onClick={handleConfirm}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Setting up...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Start My Journey 🚀
                </span>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              You can change your track later from Profile settings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
