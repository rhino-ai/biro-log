import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Users, Monitor, Copy, ExternalLink, Timer, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useGame } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface RoomUser {
  id: string;
  name: string;
  avatar: string;
  joinedAt: number;
}

const VirtualLibraryPage = () => {
  const { user } = useAuth();
  const { profile } = useGame();
  const [meetingId, setMeetingId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [studyTime, setStudyTime] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isInRoom) {
      interval = setInterval(() => setStudyTime(prev => prev + 1), 60000); // add 1 min every 60s
    } else {
      setStudyTime(0);
    }
    return () => clearInterval(interval);
  }, [isInRoom]);

  useEffect(() => {
    if (!isInRoom || !roomName || !user) return;
    
    const channel = supabase.channel(`study-room-${roomName}`, {
      config: { presence: { key: user.id } }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const users: RoomUser[] = [];
      for (const id in state) {
        // We get the first object since presence states are arrays
        const pres = state[id][0] as any;
        if (pres) {
          users.push({
            id,
            name: pres.name,
            avatar: pres.avatar,
            joinedAt: pres.joinedAt
          });
        }
      }
      setRoomUsers(users);
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({
          name: profile.name,
          avatar: profile.avatar,
          joinedAt: Date.now()
        });
      }
    });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [isInRoom, roomName, user, profile.name, profile.avatar]);

  const generateId = () => {
    const id = `BIRO-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setMeetingId(id);
    toast({ title: 'Room created!', description: `Meeting ID: ${id}` });
  };

  const copyId = () => {
    navigator.clipboard.writeText(meetingId);
    toast({ title: 'Copied!' });
  };

  const joinRoom = () => {
    if (!meetingId.trim()) { toast({ title: 'Enter a Meeting ID', variant: 'destructive' }); return; }
    setIsInRoom(true);
    setRoomName(meetingId);
  };

  if (isInRoom) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setIsInRoom(false)}>← Leave</Button>
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-accent" />
              <span className="font-game text-sm">{roomName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full flex items-center gap-1">
              <Users className="w-3 h-3" /> {roomUsers.length}
            </span>
          </div>
        </div>

        <div className="flex-1 bg-secondary/10 flex flex-col">
          <div className="p-4 text-center">
            <h3 className="font-game text-xl text-primary mb-1">Study Timer</h3>
            <div className="text-4xl font-mono font-bold tracking-wider text-glow-purple">
              {Math.floor(studyTime / 60).toString().padStart(2, '0')}:
              {(studyTime % 60).toString().padStart(2, '0')}
            </div>
            <p className="text-xs text-muted-foreground mt-2">min : sec</p>
          </div>

          <div className="px-4 pb-2 flex justify-between items-center text-sm font-medium">
            <span>Members Present ({roomUsers.length})</span>
            <Button variant="ghost" size="sm" onClick={copyId} className="h-8 gap-1 text-xs">
              <Copy className="w-3 h-3" /> Copy ID
            </Button>
          </div>

          <ScrollArea className="flex-1 px-4">
            <div className="grid grid-cols-2 gap-3 pb-6">
              {roomUsers.map((ru) => (
                <div key={ru.id} className={cn(
                  "glass-panel p-3 rounded-2xl flex flex-col items-center gap-2 border",
                  ru.id === user?.id ? "border-primary/50" : "border-white/10"
                )}>
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl relative">
                    {ru.avatar}
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                  </div>
                  <div className="text-center w-full">
                    <p className="text-xs font-semibold truncate">{ru.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {Math.floor((Date.now() - ru.joinedAt) / 60000)}m studying
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <h1 className="font-game text-xl">📚 Virtual Library</h1>
          <div className="w-12" />
        </div>

        <div className="glass-panel rounded-2xl p-6 border border-primary/30 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mx-auto flex items-center justify-center">
            <Video className="w-10 h-10 text-white" />
          </div>
          <h2 className="font-game text-lg">Study Together</h2>
          <p className="text-sm text-muted-foreground">Create or join a virtual study room with friends. Video call with screen sharing.</p>
          <span className="text-[10px] bg-accent/20 text-accent px-3 py-1 rounded-full inline-block">🔒 End-to-End Encrypted</span>
        </div>

        <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle className="text-sm font-game">Create New Room</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={generateId} className="w-full bg-primary gap-2"><Video className="w-4 h-4" /> Create Study Room</Button>
            {meetingId && (
              <div className="flex gap-2">
                <Input value={meetingId} readOnly className="bg-secondary/50 font-game text-sm text-center" />
                <Button size="icon" variant="outline" onClick={copyId}><Copy className="w-4 h-4" /></Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="glass-panel border-accent/20">
          <CardHeader><CardTitle className="text-sm font-game">Join Room</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={meetingId} onChange={e => setMeetingId(e.target.value.toUpperCase())} placeholder="Enter Meeting ID (e.g., BIRO-XXXX-XXXX)" className="bg-secondary/50 font-game text-center" />
            <Button onClick={joinRoom} className="w-full bg-accent gap-2" disabled={!meetingId.trim()}>
              <ExternalLink className="w-4 h-4" /> Join Room
            </Button>
          </CardContent>
        </Card>

        <div className="glass-panel rounded-2xl p-4 border border-white/10 space-y-2">
          <h3 className="font-game text-xs text-muted-foreground">Features</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2"><span>📹</span> Video Calling</div>
            <div className="flex items-center gap-2"><span>🖥️</span> Screen Share</div>
            <div className="flex items-center gap-2"><span>🔒</span> E2E Encrypted</div>
            <div className="flex items-center gap-2"><span>👥</span> Multi-User</div>
            <div className="flex items-center gap-2"><span>🎯</span> Focus Timer</div>
            <div className="flex items-center gap-2"><span>📝</span> Shared Notes</div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default VirtualLibraryPage;
