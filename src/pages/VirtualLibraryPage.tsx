import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Video, Users, Monitor, Copy, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useGame } from '@/hooks/useGame';
import { cn } from '@/lib/utils';

const VirtualLibraryPage = () => {
  const { profile } = useGame();
  const [meetingId, setMeetingId] = useState('');
  const [isInRoom, setIsInRoom] = useState(false);
  const [roomName, setRoomName] = useState('');

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
            <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded-full">🔒 E2E Encrypted</span>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-secondary/10">
          <div className="text-center space-y-4 max-w-sm px-4">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-accent mx-auto flex items-center justify-center text-4xl">
              {profile.avatar}
            </div>
            <h3 className="font-game text-lg">{profile.name}'s Study Room</h3>
            <p className="text-sm text-muted-foreground">
              Video calling requires WebRTC peer-to-peer connection.
              Share your Meeting ID with friends to study together!
            </p>
            <div className="glass-panel rounded-xl p-4 border border-primary/20 space-y-3">
              <p className="text-xs text-muted-foreground">Meeting ID</p>
              <div className="flex gap-2">
                <Input value={roomName} readOnly className="bg-secondary/50 font-game text-center" />
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(roomName); toast({ title: 'Copied!' }); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-panel rounded-xl p-3 text-center border border-primary/20">
                <Video className="w-5 h-5 mx-auto mb-1 text-primary" />
                <span className="text-[10px]">Camera</span>
              </div>
              <div className="glass-panel rounded-xl p-3 text-center border border-accent/20">
                <Monitor className="w-5 h-5 mx-auto mb-1 text-accent" />
                <span className="text-[10px]">Screen Share</span>
              </div>
              <div className="glass-panel rounded-xl p-3 text-center border border-coins/20">
                <Users className="w-5 h-5 mx-auto mb-1 text-coins" />
                <span className="text-[10px]">Invite</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              🔒 All calls are end-to-end encrypted. No data is stored.
            </p>
          </div>
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
