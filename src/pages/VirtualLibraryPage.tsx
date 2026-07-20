import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Video, Users, Monitor, Copy, ExternalLink, Mic, MicOff, VideoOff, Send, DoorOpen, Loader2, PhoneCall, PhoneOff } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useGame } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWebRTCMesh, type RemotePeer } from '@/hooks/useWebRTCMesh';

const supabase = _supabase as any;

type StudyRoom = { id: string; code: string; title: string; owner_id: string; is_active: boolean; created_at: string };
type RoomUser = { id: string; name: string; avatar: string | null; joinedAt: number };
type RoomMessage = { id: string; room_id: string; sender_id: string; content: string; created_at: string; sender_name?: string };

const makeRoomCode = () => `BIRO-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

const VirtualLibraryPage = () => {
  const { user, isGuest } = useAuth();
  const { profile } = useGame();
  const [meetingId, setMeetingId] = useState('');
  const [roomTitle, setRoomTitle] = useState('Deep Study Room');
  const [activeRoom, setActiveRoom] = useState<StudyRoom | null>(null);
  const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
  const [studySeconds, setStudySeconds] = useState(0);
  const [messages, setMessages] = useState<RoomMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [screenOn, setScreenOn] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [callStream, setCallStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { peers } = useWebRTCMesh({
    roomKey: activeRoom?.id ?? null,
    selfUserId: user?.id ?? null,
    selfName: profile.name || 'Student',
    localStream: callStream,
    enabled: callActive && !!activeRoom && !!user,
  });

  const stopMedia = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    screenStreamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    screenStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setMicOn(false);
    setScreenOn(false);
    setCallStream(null);
    setCallActive(false);
  }, []);

  const startCall = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      setCallStream(stream);
      setCameraOn(true);
      setMicOn(true);
      setCallActive(true);
      if (videoRef.current) videoRef.current.srcObject = stream;
      toast({ title: 'Live call started', description: 'Others in this room will connect automatically.' });
    } catch (error) {
      toast({ title: 'Call blocked', description: error instanceof Error ? error.message : 'Allow camera + mic.', variant: 'destructive' });
    }
  }, []);

  const endCall = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    screenStreamRef.current = null;
    setCallStream(null);
    setCallActive(false);
    setScreenOn(false);
    setCameraOn(false);
    setMicOn(false);
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => () => stopMedia(), [stopMedia]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeRoom) interval = setInterval(() => setStudySeconds(prev => prev + 1), 1000);
    else setStudySeconds(0);
    return () => { if (interval) clearInterval(interval); };
  }, [activeRoom]);

  const loadMessages = useCallback(async (roomId: string) => {
    const { data, error } = await supabase.from('study_room_messages').select('id,room_id,sender_id,content,created_at').eq('room_id', roomId).order('created_at', { ascending: true }).limit(150);
    if (error) { toast({ title: 'Room chat failed', description: error.message, variant: 'destructive' }); return; }
    const senderIds = Array.from(new Set((data || []).map((m: any) => m.sender_id)));
    const { data: profs } = senderIds.length ? await supabase.from('profiles').select('user_id,name').in('user_id', senderIds) : { data: [] };
    setMessages((data || []).map((m: any) => ({ ...m, sender_name: (profs || []).find((p: any) => p.user_id === m.sender_id)?.name || 'Student' })));
  }, []);

  const enterRoom = useCallback(async (room: StudyRoom) => {
    if (!user) return;
    const { error } = await supabase.from('study_room_members').upsert({ room_id: room.id, user_id: user.id, role: room.owner_id === user.id ? 'host' : 'member', last_seen_at: new Date().toISOString() }, { onConflict: 'room_id,user_id' });
    if (error) { toast({ title: 'Join failed', description: error.message, variant: 'destructive' }); return; }
    setActiveRoom(room);
    setMeetingId(room.code);
    await loadMessages(room.id);
  }, [user, loadMessages]);

  useEffect(() => {
    if (!activeRoom || !user) return;
    const channel = supabase.channel(`study-room-${activeRoom.id}`, { config: { presence: { key: user.id } } });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users: RoomUser[] = [];
        Object.keys(state).forEach((id) => {
          const pres = (state[id]?.[0] || {}) as any;
          users.push({ id, name: pres.name || 'Student', avatar: pres.avatar || null, joinedAt: pres.joinedAt || Date.now() });
        });
        setRoomUsers(users);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_room_messages', filter: `room_id=eq.${activeRoom.id}` }, async (payload: any) => {
        const { data: prof } = await supabase.from('profiles').select('name').eq('user_id', payload.new.sender_id).maybeSingle();
        setMessages(prev => prev.some(m => m.id === payload.new.id) ? prev : [...prev, { ...payload.new, sender_name: prof?.name || 'Student' }]);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: profile.name || 'Student', avatar: profile.avatar || '👤', joinedAt: Date.now() });
        }
      });
    return () => { channel.untrack(); supabase.removeChannel(channel); };
  }, [activeRoom, user, profile.name, profile.avatar]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const createRoom = async () => {
    if (!user) return;
    setIsCreating(true);
    const code = makeRoomCode();
    const { data, error } = await supabase.from('study_rooms').insert({ code, title: roomTitle.trim() || 'Deep Study Room', owner_id: user.id, is_active: true }).select('id,code,title,owner_id,is_active,created_at').single();
    setIsCreating(false);
    if (error) { toast({ title: 'Room create failed', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Room created', description: code });
    await enterRoom(data as StudyRoom);
  };

  const joinRoom = async () => {
    if (!meetingId.trim() || !user) return;
    setIsJoining(true);
    const code = meetingId.trim().toUpperCase();
    const { data, error } = await supabase.from('study_rooms').select('id,code,title,owner_id,is_active,created_at').eq('code', code).eq('is_active', true).maybeSingle();
    setIsJoining(false);
    if (error || !data) { toast({ title: 'Room not found', description: 'Check the meeting ID and try again.', variant: 'destructive' }); return; }
    await enterRoom(data as StudyRoom);
  };

  const copyId = async () => {
    const code = activeRoom?.code || meetingId;
    if (!code) return;
    await navigator.clipboard.writeText(code);
    toast({ title: 'Meeting ID copied' });
  };

  const leaveRoom = async () => {
    stopMedia();
    if (activeRoom && user) {
      await supabase.from('study_room_members').update({ last_seen_at: new Date().toISOString() }).eq('room_id', activeRoom.id).eq('user_id', user.id);
    }
    setActiveRoom(null);
    setRoomUsers([]);
    setMessages([]);
  };

  const toggleCamera = async () => {
    try {
      if (callActive && callStream) {
        const videoTracks = callStream.getVideoTracks();
        if (videoTracks.length) {
          videoTracks.forEach((t) => (t.enabled = !cameraOn));
          setCameraOn(!cameraOn);
        }
        return;
      }
      if (cameraOn) {
        streamRef.current?.getVideoTracks().forEach((track) => track.stop());
        setCameraOn(false);
        if (!micOn && videoRef.current) videoRef.current.srcObject = null;
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: micOn });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      if (stream.getAudioTracks().length) setMicOn(true);
    } catch (error) {
      toast({ title: 'Camera blocked', description: error instanceof Error ? error.message : 'Allow camera permission.', variant: 'destructive' });
    }
  };

  const toggleMic = async () => {
    try {
      if (callActive && callStream) {
        const audioTracks = callStream.getAudioTracks();
        if (audioTracks.length) {
          audioTracks.forEach((t) => (t.enabled = !micOn));
          setMicOn(!micOn);
        }
        return;
      }
      if (micOn) {
        streamRef.current?.getAudioTracks().forEach((track) => track.stop());
        setMicOn(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: cameraOn });
      streamRef.current = stream;
      if (cameraOn && videoRef.current) videoRef.current.srcObject = stream;
      setMicOn(true);
      if (stream.getVideoTracks().length) setCameraOn(true);
    } catch (error) {
      toast({ title: 'Mic blocked', description: error instanceof Error ? error.message : 'Allow microphone permission.', variant: 'destructive' });
    }
  };

  const toggleScreen = async () => {
    try {
      if (callActive) {
        if (screenOn) {
          screenStreamRef.current?.getTracks().forEach((t) => t.stop());
          screenStreamRef.current = null;
          // Revert to camera stream
          const cam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          streamRef.current?.getTracks().forEach((t) => t.stop());
          streamRef.current = cam;
          setCallStream(cam);
          if (videoRef.current) videoRef.current.srcObject = cam;
          setScreenOn(false);
          return;
        }
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
        // Merge screen video with existing mic audio for peers
        const existingAudio = streamRef.current?.getAudioTracks() || [];
        const merged = new MediaStream([...screen.getVideoTracks(), ...existingAudio]);
        screenStreamRef.current = screen;
        setCallStream(merged);
        if (videoRef.current) videoRef.current.srcObject = merged;
        screen.getVideoTracks()[0]?.addEventListener('ended', () => {
          setScreenOn(false);
          const cam = streamRef.current;
          if (cam && videoRef.current) videoRef.current.srcObject = cam;
          if (cam) setCallStream(cam);
        });
        setScreenOn(true);
        return;
      }
      if (screenOn) {
        screenStreamRef.current?.getTracks().forEach((track) => track.stop());
        screenStreamRef.current = null;
        setScreenOn(false);
        if (videoRef.current) videoRef.current.srcObject = streamRef.current;
        return;
      }
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      screenStreamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      stream.getVideoTracks()[0]?.addEventListener('ended', () => setScreenOn(false));
      setScreenOn(true);
    } catch (error) {
      toast({ title: 'Screen share stopped', description: error instanceof Error ? error.message : 'Could not share screen.' });
    }
  };

  const sendMessage = async () => {
    const content = messageInput.trim();
    if (!content || !activeRoom || !user) return;
    setMessageInput('');
    const { error } = await supabase.from('study_room_messages').insert({ room_id: activeRoom.id, sender_id: user.id, content });
    if (error) toast({ title: 'Message failed', description: error.message, variant: 'destructive' });
  };

  if (isGuest) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
          <BackButton to="/" />
          <div className="glass-panel rounded-xl p-5 border border-primary/30 text-center space-y-3">
            <Video className="w-12 h-12 mx-auto text-primary" />
            <h1 className="font-game text-lg">Library rooms need sign-in</h1>
            <p className="text-sm text-muted-foreground">Guest mode can explore, but live rooms, camera, chat, and study history need an account.</p>
            <Button className="w-full" onClick={() => window.location.assign('/auth')}>Sign in</Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (activeRoom) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/95 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={leaveRoom} className="gap-1"><DoorOpen className="w-4 h-4" /> Leave</Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><Video className="w-4 h-4 text-accent" /><span className="font-game text-sm truncate">{activeRoom.title}</span></div>
              <p className="text-[10px] text-muted-foreground">{activeRoom.code}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={copyId} className="gap-1"><Copy className="w-3 h-3" /> ID</Button>
        </div>

        <div className="flex-1 grid lg:grid-cols-[1fr_340px] min-h-0">
          <div className="p-4 space-y-4 min-h-0 flex flex-col">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary/40 border border-border flex items-center justify-center">
              <video ref={videoRef} autoPlay muted playsInline className={cn('w-full h-full object-cover', !cameraOn && !screenOn && 'hidden')} />
              {!cameraOn && !screenOn && <div className="text-center space-y-2"><VideoOff className="w-14 h-14 mx-auto text-muted-foreground" /><p className="text-sm text-muted-foreground">Camera off</p></div>}
              <div className="absolute top-3 left-3 bg-background/80 rounded-lg px-3 py-1 font-mono text-sm">
                {Math.floor(studySeconds / 3600).toString().padStart(2, '0')}:{Math.floor((studySeconds % 3600) / 60).toString().padStart(2, '0')}:{(studySeconds % 60).toString().padStart(2, '0')}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button variant={cameraOn ? 'default' : 'outline'} onClick={toggleCamera} className="gap-2">{cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />} Camera</Button>
              <Button variant={micOn ? 'default' : 'outline'} onClick={toggleMic} className="gap-2">{micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />} Mic</Button>
              <Button variant={screenOn ? 'default' : 'outline'} onClick={toggleScreen} className="gap-2"><Monitor className="w-4 h-4" /> Screen</Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pb-2">
              {roomUsers.map((ru) => (
                <div key={ru.id} className={cn('glass-panel p-3 rounded-xl flex items-center gap-2 border', ru.id === user?.id ? 'border-primary/50' : 'border-border')}>
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">{ru.avatar || '👤'}</div>
                  <div className="min-w-0"><p className="text-xs font-semibold truncate">{ru.name}</p><p className="text-[10px] text-muted-foreground">{Math.floor((Date.now() - ru.joinedAt) / 60000)}m</p></div>
                </div>
              ))}
            </div>
          </div>

          <aside className="border-l border-border bg-card/40 min-h-0 flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between"><span className="font-game text-sm">Room Chat</span><span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {roomUsers.length}</span></div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div key={msg.id} className={cn('rounded-lg p-2 border', msg.sender_id === user?.id ? 'bg-accent/20 border-accent/30 ml-6' : 'bg-secondary/30 border-border mr-6')}>
                    <p className="text-[10px] text-muted-foreground mb-1">{msg.sender_name || 'Student'} • {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border flex gap-2">
              <Textarea value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Shared notes / chat..." className="min-h-[44px] max-h-24 bg-secondary/50" />
              <Button size="icon" onClick={sendMessage} disabled={!messageInput.trim()} className="shrink-0"><Send className="w-4 h-4" /></Button>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="flex items-center justify-between"><BackButton to="/" /><h1 className="font-game text-xl">Virtual Library</h1><div className="w-12" /></div>

        <div className="glass-panel rounded-xl p-6 border border-primary/30 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 mx-auto flex items-center justify-center"><Video className="w-10 h-10 text-primary" /></div>
          <h2 className="font-game text-lg">Study Together</h2>
          <p className="text-sm text-muted-foreground">Create a persistent study room, share its ID, chat, use camera/mic, and screen-share while studying.</p>
        </div>

        <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle className="text-sm font-game">Create New Room</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={roomTitle} onChange={(e) => setRoomTitle(e.target.value)} placeholder="Room title" className="bg-secondary/50" />
            <Button onClick={createRoom} className="w-full bg-primary gap-2" disabled={isCreating}>{isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />} Create & Enter</Button>
          </CardContent>
        </Card>

        <Card className="glass-panel border-accent/20">
          <CardHeader><CardTitle className="text-sm font-game">Join Room</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={meetingId} onChange={e => setMeetingId(e.target.value.toUpperCase())} placeholder="BIRO-XXXX-XXXX" className="bg-secondary/50 font-game text-center" />
            <Button onClick={joinRoom} className="w-full bg-accent gap-2" disabled={!meetingId.trim() || isJoining}>{isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Join Room</Button>
          </CardContent>
        </Card>

        <div className="glass-panel rounded-xl p-4 border border-border space-y-2">
          <h3 className="font-game text-xs text-muted-foreground">Live Tools</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2"><Video className="w-4 h-4 text-primary" /> Camera preview</div>
            <div className="flex items-center gap-2"><Monitor className="w-4 h-4 text-primary" /> Screen share</div>
            <div className="flex items-center gap-2"><Mic className="w-4 h-4 text-primary" /> Microphone</div>
            <div className="flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Presence</div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default VirtualLibraryPage;