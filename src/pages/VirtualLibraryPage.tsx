import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Video, Users, Monitor, Copy, ExternalLink, Mic, MicOff, VideoOff, Send, DoorOpen, Loader2, PhoneCall, PhoneOff, Search, Share2, XCircle, Link as LinkIcon, Ban, UserX, ShieldOff, MoreVertical } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useGame } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWebRTCMesh, type RemotePeer } from '@/hooks/useWebRTCMesh';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RemoteVideoTile = ({ peer }: { peer: RemotePeer }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && peer.stream) ref.current.srcObject = peer.stream;
  }, [peer.stream]);
  return (
    <div className="relative aspect-video rounded-lg overflow-hidden bg-secondary/60 border border-border">
      {peer.stream ? (
        <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Connecting…</div>
      )}
      <div className="absolute bottom-1 left-1 bg-background/70 rounded px-1.5 py-0.5 text-[10px] truncate max-w-[90%]">{peer.name}</div>
    </div>
  );
};

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
  const [myRooms, setMyRooms] = useState<StudyRoom[]>([]);
  const [searchQ, setSearchQ] = useState('');
  const [isGuestRoom, setIsGuestRoom] = useState(false);
  const [autoJoinTried, setAutoJoinTried] = useState(false);
  const [banTarget, setBanTarget] = useState<RoomUser | null>(null);
  const [banScope, setBanScope] = useState<'room' | 'host_all'>('room');
  const [banDuration, setBanDuration] = useState<string>('forever');
  const [banReason, setBanReason] = useState('');
  const [isBanning, setIsBanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hostChannelRef = useRef<any>(null);

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
    // Join via secure RPC: verifies the room code server-side and enforces invite semantics.
    const { error } = await supabase.rpc('join_study_room_by_code', { _code: room.code });
    if (error) { toast({ title: 'Join failed', description: error.message, variant: 'destructive' }); return; }
    setActiveRoom(room);
    setMeetingId(room.code);
    setIsGuestRoom(false);
    await loadMessages(room.id);
  }, [user, loadMessages]);

  useEffect(() => {
    if (!activeRoom || !user) return;
    if (isGuestRoom) return;
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
      .on('broadcast', { event: 'meeting-ended' }, () => {
        toast({ title: 'Meeting ended', description: 'The host ended this study room.' });
        void leaveRoom();
      })
      .on('broadcast', { event: 'force-mute' }, ({ payload }: any) => {
        if (payload?.target !== user.id) return;
        streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
        callStream?.getAudioTracks().forEach((t) => (t.enabled = false));
        setMicOn(false);
        toast({ title: 'Muted by host', variant: 'destructive' });
      })
      .on('broadcast', { event: 'force-cam-off' }, ({ payload }: any) => {
        if (payload?.target !== user.id) return;
        streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
        callStream?.getVideoTracks().forEach((t) => (t.enabled = false));
        setCameraOn(false);
        toast({ title: 'Camera turned off by host', variant: 'destructive' });
      })
      .on('broadcast', { event: 'kick' }, ({ payload }: any) => {
        if (payload?.target !== user.id) return;
        toast({ title: 'Removed by host', description: payload?.banned ? 'You were banned from this room.' : 'You were removed.', variant: 'destructive' });
        void leaveRoom();
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ name: profile.name || 'Student', avatar: profile.avatar || '👤', joinedAt: Date.now() });
        }
      });
    hostChannelRef.current = channel;
    return () => { channel.untrack(); supabase.removeChannel(channel); };
  }, [activeRoom, user, profile.name, profile.avatar, isGuestRoom, callStream]);

  // Load my recent rooms for search list
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: mem } = await supabase.from('study_room_members').select('room_id').eq('user_id', user.id).limit(50);
      const ids = Array.from(new Set((mem || []).map((m: any) => m.room_id)));
      if (!ids.length) { setMyRooms([]); return; }
      const { data } = await supabase.from('study_rooms').select('id,code,title,owner_id,is_active,created_at').in('id', ids).order('created_at', { ascending: false });
      setMyRooms((data || []) as StudyRoom[]);
    })();
  }, [user, activeRoom]);

  // Guest-mode meeting-ended listener
  useEffect(() => {
    if (!activeRoom || !isGuestRoom) return;
    const channel = supabase.channel(`study-room-guest-${activeRoom.code}`);
    channel.on('broadcast', { event: 'meeting-ended' }, () => {
      toast({ title: 'Meeting ended', description: 'The host ended this study room.' });
      void leaveRoom();
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom, isGuestRoom]);

  // Auto-join via ?join=CODE (Zoom-style deep link)
  useEffect(() => {
    if (autoJoinTried) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (!code) return;
    setAutoJoinTried(true);
    const clean = code.trim().toUpperCase();
    setMeetingId(clean);
    setTimeout(() => { void joinRoomWithCode(clean); }, 300);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isGuest, autoJoinTried]);

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
    if (!meetingId.trim()) return;
    await joinRoomWithCode(meetingId.trim().toUpperCase());
  };

  const joinRoomWithCode = async (code: string) => {
    if (!code) return;
    setIsJoining(true);
    if (!user) {
      // Guest attendee — WebRTC only, no DB writes
      setIsJoining(false);
      const guestRoom: StudyRoom = { id: `guest-${code}`, code, title: `Room ${code}`, owner_id: '', is_active: true, created_at: new Date().toISOString() };
      setActiveRoom(guestRoom);
      setMeetingId(code);
      setIsGuestRoom(true);
      setMessages([]);
      toast({ title: 'Joined as guest', description: 'Sign in to chat & save study history.' });
      return;
    }
    const { data: rid, error: rpcErr } = await supabase.rpc('join_study_room_by_code', { _code: code });
    if (rpcErr || !rid) {
      setIsJoining(false);
      toast({ title: 'Room not found', description: rpcErr?.message || 'Check the meeting ID and try again.', variant: 'destructive' });
      return;
    }
    const { data, error } = await supabase.from('study_rooms').select('id,code,title,owner_id,is_active,created_at').eq('id', rid as string).maybeSingle();
    setIsJoining(false);
    if (error || !data) { toast({ title: 'Room not found', description: 'Try again.', variant: 'destructive' }); return; }
    setActiveRoom(data as StudyRoom);
    setMeetingId(code);
    setIsGuestRoom(false);
    await loadMessages((data as StudyRoom).id);
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
    setIsGuestRoom(false);
    const params = new URLSearchParams(window.location.search);
    if (params.has('join')) {
      params.delete('join');
      const next = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState({}, '', next);
    }
  };

  const isOwner = !!(activeRoom && user && activeRoom.owner_id === user.id);

  const endMeeting = async () => {
    if (!activeRoom || !isOwner) return;
    if (!window.confirm('End this meeting for everyone?')) return;
    try {
      const c1 = supabase.channel(`study-room-${activeRoom.id}`);
      const c2 = supabase.channel(`study-room-guest-${activeRoom.code}`);
      await new Promise<void>((resolve) => { c1.subscribe((s: string) => { if (s === 'SUBSCRIBED') resolve(); }); });
      await c1.send({ type: 'broadcast', event: 'meeting-ended', payload: {} });
      await new Promise<void>((resolve) => { c2.subscribe((s: string) => { if (s === 'SUBSCRIBED') resolve(); }); });
      await c2.send({ type: 'broadcast', event: 'meeting-ended', payload: {} });
      supabase.removeChannel(c1);
      supabase.removeChannel(c2);
    } catch {}
    await supabase.from('study_rooms').update({ is_active: false }).eq('id', activeRoom.id);
    toast({ title: 'Meeting ended' });
    await leaveRoom();
  };

  const hostBroadcast = async (event: string, payload: any) => {
    const ch = hostChannelRef.current;
    if (!ch) return;
    try { await ch.send({ type: 'broadcast', event, payload }); } catch {}
  };

  const muteMember = async (target: RoomUser) => {
    if (!isOwner) return;
    await hostBroadcast('force-mute', { target: target.id });
    toast({ title: `Muted ${target.name}` });
  };

  const camOffMember = async (target: RoomUser) => {
    if (!isOwner) return;
    await hostBroadcast('force-cam-off', { target: target.id });
    toast({ title: `Cam off ${target.name}` });
  };

  const kickMember = async (target: RoomUser) => {
    if (!isOwner || !activeRoom) return;
    await hostBroadcast('kick', { target: target.id, banned: false });
    await supabase.from('study_room_members').delete().eq('room_id', activeRoom.id).eq('user_id', target.id);
    toast({ title: `Removed ${target.name}` });
  };

  const durationToExpiry = (d: string): string | null => {
    if (d === 'forever') return null;
    const now = new Date();
    const map: Record<string, number> = {
      '1h': 3600e3, '6h': 6 * 3600e3, '24h': 24 * 3600e3,
      '3d': 3 * 86400e3, '7d': 7 * 86400e3, '30d': 30 * 86400e3,
      '90d': 90 * 86400e3, '365d': 365 * 86400e3,
    };
    return new Date(now.getTime() + (map[d] || 0)).toISOString();
  };

  const confirmBan = async () => {
    if (!banTarget || !isOwner || !activeRoom || !user) return;
    setIsBanning(true);
    const expires_at = durationToExpiry(banDuration);
    const { error } = await supabase.from('study_room_bans').insert({
      room_id: banScope === 'room' ? activeRoom.id : null,
      host_id: user.id,
      user_id: banTarget.id,
      scope: banScope,
      expires_at,
      reason: banReason.trim() || null,
    });
    setIsBanning(false);
    if (error) { toast({ title: 'Ban failed', description: error.message, variant: 'destructive' }); return; }
    await hostBroadcast('kick', { target: banTarget.id, banned: true });
    await supabase.from('study_room_members').delete().eq('room_id', activeRoom.id).eq('user_id', banTarget.id);
    toast({ title: `Banned ${banTarget.name}`, description: banScope === 'host_all' ? 'From all your rooms' : 'From this room' });
    setBanTarget(null);
    setBanReason('');
    setBanDuration('forever');
    setBanScope('room');
  };

  const shareInviteLink = async () => {
    const code = activeRoom?.code || meetingId;
    if (!code) return;
    const url = `${window.location.origin}/virtual-library?join=${encodeURIComponent(code)}`;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title: 'Join my Biro-log study room', text: `Join code: ${code}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: 'Invite link copied', description: url });
      }
    } catch {
      try { await navigator.clipboard.writeText(url); toast({ title: 'Invite link copied' }); } catch {}
    }
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

  // Guests can join rooms via invite link — no gate here.

  if (activeRoom) {
    return (
      <div className="fixed inset-0 z-50 bg-background flex flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/95 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="sm" onClick={leaveRoom} className="gap-1"><DoorOpen className="w-4 h-4" /> Leave</Button>
            <div className="min-w-0">
              <div className="flex items-center gap-2"><Video className="w-4 h-4 text-accent" /><span className="font-game text-sm truncate">{activeRoom.title}</span>{isGuestRoom && <span className="text-[9px] bg-accent/30 px-1.5 py-0.5 rounded">GUEST</span>}</div>
              <p className="text-[10px] text-muted-foreground">{activeRoom.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" onClick={shareInviteLink} className="gap-1"><Share2 className="w-3 h-3" /> Share</Button>
            <Button variant="outline" size="sm" onClick={copyId} className="gap-1"><Copy className="w-3 h-3" /> ID</Button>
            {isOwner && <Button variant="destructive" size="sm" onClick={endMeeting} className="gap-1"><XCircle className="w-3 h-3" /> End</Button>}
          </div>
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

            <div className="grid grid-cols-1">
              {callActive ? (
                <Button variant="destructive" onClick={endCall} className="gap-2"><PhoneOff className="w-4 h-4" /> End Live Call</Button>
              ) : (
                <Button onClick={startCall} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"><PhoneCall className="w-4 h-4" /> Join Live Video Call</Button>
              )}
            </div>

            {callActive && peers.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {peers.map((p) => (
                  <RemoteVideoTile key={p.peerId} peer={p} />
                ))}
              </div>
            )}
            {callActive && peers.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-2">Waiting for others to join the call…</div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pb-2">
              {roomUsers.map((ru) => (
                <div key={ru.id} className={cn('glass-panel p-3 rounded-xl flex items-center gap-2 border', ru.id === user?.id ? 'border-primary/50' : 'border-border')}>
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">{ru.avatar || '👤'}</div>
                  <div className="min-w-0 flex-1"><p className="text-xs font-semibold truncate">{ru.name}{ru.id === activeRoom?.owner_id && <span className="ml-1 text-[9px] bg-primary/30 px-1 rounded">HOST</span>}</p><p className="text-[10px] text-muted-foreground">{Math.floor((Date.now() - ru.joinedAt) / 60000)}m</p></div>
                  {isOwner && ru.id !== user?.id && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"><MoreVertical className="w-3.5 h-3.5" /></Button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-44 p-1">
                        <button onClick={() => muteMember(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2"><MicOff className="w-3.5 h-3.5" /> Mute mic</button>
                        <button onClick={() => camOffMember(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2"><VideoOff className="w-3.5 h-3.5" /> Turn off cam</button>
                        <button onClick={() => kickMember(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2 text-orange-500"><UserX className="w-3.5 h-3.5" /> Kick</button>
                        <button onClick={() => setBanTarget(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2 text-destructive"><Ban className="w-3.5 h-3.5" /> Ban…</button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              ))}
            </div>
          </div>

          <aside className="border-l border-border bg-card/40 min-h-0 flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between"><span className="font-game text-sm">Room Chat</span><span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {roomUsers.length}</span></div>
            <ScrollArea className="flex-1 p-3">
              <div className="space-y-3">
                {isGuestRoom && (
                  <div className="text-center text-xs text-muted-foreground p-3 bg-secondary/30 rounded-lg">
                    Sign in to chat & save study history.
                  </div>
                )}
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
              <Textarea value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder={isGuestRoom ? 'Sign in to chat…' : 'Shared notes / chat...'} disabled={isGuestRoom} className="min-h-[44px] max-h-24 bg-secondary/50" />
              <Button size="icon" onClick={sendMessage} disabled={!messageInput.trim() || isGuestRoom} className="shrink-0"><Send className="w-4 h-4" /></Button>
            </div>
          </aside>
        </div>

        <Dialog open={!!banTarget} onOpenChange={(o) => !o && setBanTarget(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Ban className="w-4 h-4 text-destructive" /> Ban {banTarget?.name}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Scope</label>
                <Select value={banScope} onValueChange={(v) => setBanScope(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="room">This meeting only</SelectItem>
                    <SelectItem value="host_all">All my rooms (present & future)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Duration</label>
                <Select value={banDuration} onValueChange={setBanDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">1 hour</SelectItem>
                    <SelectItem value="6h">6 hours</SelectItem>
                    <SelectItem value="24h">1 day</SelectItem>
                    <SelectItem value="3d">3 days</SelectItem>
                    <SelectItem value="7d">1 week</SelectItem>
                    <SelectItem value="30d">1 month</SelectItem>
                    <SelectItem value="90d">3 months</SelectItem>
                    <SelectItem value="365d">1 year</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Reason (optional)</label>
                <Input value={banReason} onChange={(e) => setBanReason(e.target.value)} placeholder="Spam, disruption, etc." />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setBanTarget(null)}>Cancel</Button>
              <Button variant="destructive" onClick={confirmBan} disabled={isBanning} className="gap-2">{isBanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />} Ban</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
          <p className="text-sm text-muted-foreground">{isGuest ? 'Paste an invite link or code below to join as guest — no install needed.' : 'Create a room, share the invite link (Zoom-style), and study together.'}</p>
        </div>

        {!isGuest && <Card className="glass-panel border-primary/20">
          <CardHeader><CardTitle className="text-sm font-game">Create New Room</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={roomTitle} onChange={(e) => setRoomTitle(e.target.value)} placeholder="Room title" className="bg-secondary/50" />
            <Button onClick={createRoom} className="w-full bg-primary gap-2" disabled={isCreating}>{isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />} Create & Enter</Button>
          </CardContent>
        </Card>}

        <Card className="glass-panel border-accent/20">
          <CardHeader><CardTitle className="text-sm font-game flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Join with Code or Link</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Input value={meetingId} onChange={e => setMeetingId(e.target.value.toUpperCase())} placeholder="BIRO-XXXX-XXXX" className="bg-secondary/50 font-game text-center" />
            <Button onClick={joinRoom} className="w-full bg-accent gap-2" disabled={!meetingId.trim() || isJoining}>{isJoining ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />} Join Room</Button>
            <p className="text-[10px] text-muted-foreground text-center">Anyone with the link can join — even guests without signing in.</p>
          </CardContent>
        </Card>

        {!isGuest && (
          <Card className="glass-panel border-border">
            <CardHeader><CardTitle className="text-sm font-game flex items-center gap-2"><Search className="w-4 h-4" /> My Study Rooms</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input value={searchQ} onChange={(e) => setSearchQ(e.target.value)} placeholder="Search by title or code…" className="pl-9 bg-secondary/50" />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {myRooms.filter((r) => {
                  const q = searchQ.trim().toLowerCase();
                  if (!q) return true;
                  return r.title.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
                }).map((r) => (
                  <button key={r.id} onClick={() => enterRoom(r)} className="w-full text-left glass-panel p-3 rounded-lg border border-border hover:border-primary/50 transition flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate flex items-center gap-2">{r.title} {!r.is_active && <span className="text-[9px] bg-destructive/30 px-1.5 rounded">ENDED</span>}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{r.code}</p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>
                ))}
                {myRooms.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No rooms yet. Create one above.</p>}
              </div>
            </CardContent>
          </Card>
        )}

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