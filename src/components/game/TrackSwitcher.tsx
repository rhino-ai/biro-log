import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { StudyTrack, getJunglesByTrack } from '@/data/syllabus';
import { GraduationCap, Stethoscope, School, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TrackOption {
  id: StudyTrack;
  name: string;
  shortName: string;
  icon: React.ReactNode;
  color: string;
}

const trackOptions: TrackOption[] = [
  {
    id: 'jee',
    name: 'JEE (Engineering)',
    shortName: 'JEE',
    icon: <GraduationCap className="w-4 h-4" />,
    color: 'text-blue-400',
  },
  {
    id: 'neet',
    name: 'NEET (Medical)',
    shortName: 'NEET',
    icon: <Stethoscope className="w-4 h-4" />,
    color: 'text-green-400',
  },
  {
    id: 'highschool',
    name: 'High School',
    shortName: 'School',
    icon: <School className="w-4 h-4" />,
    color: 'text-orange-400',
  },
];

export const TrackSwitcher = () => {
  const { studyTrack, setStudyTrack, setJungles, hasSelectedTrack } = useGameStore();
  const [pendingTrack, setPendingTrack] = useState<StudyTrack | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const currentTrack = trackOptions.find((t) => t.id === studyTrack) || trackOptions[0];

  const handleSelectTrack = (track: StudyTrack) => {
    if (track === studyTrack) return;
    setPendingTrack(track);
    setShowConfirm(true);
  };

  const confirmSwitch = () => {
    if (!pendingTrack) return;

    const jungles = getJunglesByTrack(pendingTrack);
    setStudyTrack(pendingTrack);
    setJungles(JSON.parse(JSON.stringify(jungles)));

    toast({
      title: '🔄 Track Changed!',
      description: `Switched to ${trackOptions.find((t) => t.id === pendingTrack)?.name}`,
    });

    setShowConfirm(false);
    setPendingTrack(null);
  };

  return (
    <>
      <div className="glass-panel rounded-xl p-4 border border-primary/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Study Track</p>
            <div className="flex items-center gap-2">
              <span className={currentTrack.color}>{currentTrack.icon}</span>
              <span className="font-game">{currentTrack.name}</span>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Change <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-panel border-primary/30">
              {trackOptions.map((track) => (
                <DropdownMenuItem
                  key={track.id}
                  onClick={() => handleSelectTrack(track.id)}
                  className={cn(
                    'gap-3 cursor-pointer',
                    track.id === studyTrack && 'bg-primary/20'
                  )}
                >
                  <span className={track.color}>{track.icon}</span>
                  <span>{track.name}</span>
                  {track.id === studyTrack && <Check className="w-4 h-4 ml-auto text-accent" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="glass-panel border-primary/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-game text-raid">⚠️ Change Study Track?</AlertDialogTitle>
            <AlertDialogDescription>
              Switching tracks will reset your jungle chapters to the new syllabus. 
              Your XP, coins, streak, and other progress will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwitch} className="bg-primary">
              Yes, Switch Track
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
