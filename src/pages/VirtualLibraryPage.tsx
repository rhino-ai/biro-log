import { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Video, Users, Monitor, Copy, ExternalLink, Mic, MicOff, VideoOff, Send, DoorOpen, Loader2, PhoneCall, PhoneOff, Search, Share2, XCircle, Link as LinkIcon, Ban, UserX, ShieldOff, MoreVertical, Pin, PinOff, MessageSquare, Wifi, WifiOff, ScrollText, Download, Gauge, Activity, Stethoscope, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, LifeBuoy, Settings } from 'lucide-react';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const connBadgeClasses = (s?: RTCPeerConnectionState) => {
  switch (s) {
    case 'connected': return { dot: 'bg-emerald-500', label: 'Good', icon: 'wifi' as const };
    case 'connecting':
    case 'new': return { dot: 'bg-amber-500 animate-pulse', label: 'Connecting', icon: 'wifi' as const };
    case 'disconnected': return { dot: 'bg-amber-500', label: 'Weak', icon: 'wifi' as const };
    case 'failed':
    case 'closed': return { dot: 'bg-destructive', label: 'Lost', icon: 'wifi-off' as const };
    default: return { dot: 'bg-muted-foreground', label: '—', icon: 'wifi' as const };
  }
};

const ConnBadge = ({ state, compact }: { state?: RTCPeerConnectionState; compact?: boolean }) => {
  const c = connBadgeClasses(state);
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full bg-background/80 backdrop-blur px-1.5 py-0.5', compact ? 'text-[9px]' : 'text-[10px]')} title={`Connection: ${c.label}`}>
      <span className={cn('w-1.5 h-1.5 rounded-full', c.dot)} />
      {c.icon === 'wifi' ? <Wifi className="w-2.5 h-2.5" /> : <WifiOff className="w-2.5 h-2.5" />}
      {!compact && <span>{c.label}</span>}
    </span>
  );
};

const RemoteVideoTile = ({ peer, large, onPin, pinned }: { peer: RemotePeer; large?: boolean; onPin?: () => void; pinned?: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current && peer.stream) ref.current.srcObject = peer.stream;
  }, [peer.stream]);
  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-secondary/60 border border-border group', large ? 'w-full h-full' : 'aspect-video')}>
      {peer.stream ? (
        <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Connecting…</div>
      )}
      <div className="absolute bottom-1 left-1 bg-background/70 rounded px-1.5 py-0.5 text-[10px] truncate max-w-[90%]">{peer.name}</div>
      <div className="absolute top-1 left-1"><ConnBadge state={peer.connectionState} compact={!large} /></div>
      {peer.reconnecting && (
        <div className="absolute inset-x-0 top-0 bg-amber-500/80 text-black text-[10px] py-0.5 text-center flex items-center justify-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Reconnecting…
        </div>
      )}
      {onPin && (
        <button
          onClick={onPin}
          className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
          title={pinned ? 'Unpin' : 'Pin'}
        >
          {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};

const LocalVideoTile = ({ stream, name, large, onPin, pinned }: { stream: MediaStream | null; name: string; large?: boolean; onPin?: () => void; pinned?: boolean }) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current) ref.current.srcObject = stream; }, [stream]);
  return (
    <div className={cn('relative rounded-lg overflow-hidden bg-secondary/60 border border-primary/40 group', large ? 'w-full h-full' : 'aspect-video')}>
      {stream ? (
        <video ref={ref} autoPlay muted playsInline className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
          <VideoOff className="w-6 h-6" />
        </div>
      )}
      <div className="absolute bottom-1 left-1 bg-primary/70 rounded px-1.5 py-0.5 text-[10px] truncate max-w-[90%]">{name} (you)</div>
      {onPin && (
        <button onClick={onPin} className="absolute top-1 right-1 bg-background/80 hover:bg-background rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity" title={pinned ? 'Unpin' : 'Pin'}>
          {pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
        </button>
      )}
    </div>
  );
};

// Stable guest identity across reloads for a device
const getGuestId = () => {
  try {
    let g = localStorage.getItem('biro-guest-id');
    if (!g) {
      g = 'guest-' + (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
      localStorage.setItem('biro-guest-id', g);
    }
    return g;
  } catch {
    return 'guest-' + Math.random().toString(36).slice(2);
  }
};

const supabase = _supabase as any;

// Interpret a MediaDevices / getUserMedia error into human, actionable info.
type MediaErrKind = 'camera' | 'mic' | 'both';
type MediaErrInfo = {
  title: string;
  reason: string;
  fix: string;
  code: string;
};
const explainMediaError = (err: unknown, kind: MediaErrKind): MediaErrInfo => {
  const anyErr = err as any;
  const name: string = anyErr?.name || '';
  const message: string = anyErr?.message || String(err ?? '');
  const dev = kind === 'camera' ? 'camera' : kind === 'mic' ? 'microphone' : 'camera & microphone';
  const base = (reason: string, fix: string, code = name || 'Error') => ({
    title: `${dev[0].toUpperCase()}${dev.slice(1)} blocked`,
    reason,
    fix,
    code,
  });
  if (name === 'NotAllowedError' || /permission|denied/i.test(message)) {
    return base(
      `Permission was denied for your ${dev}.`,
      `Tap the lock/permissions icon in your browser's address bar → set ${dev} to "Allow", then hit Retry. On Vivo / MIUI / OneUI, also enable ${dev} for your browser under phone Settings → Apps → Permissions.`,
      name || 'NotAllowedError',
    );
  }
  if (name === 'NotFoundError' || /not found|no device/i.test(message)) {
    return base(
      `No ${dev} was detected on this device.`,
      `Plug in / enable your ${dev} and try again. If it's built-in, restart the browser and phone Bluetooth headset (if any) that might be capturing it.`,
      name || 'NotFoundError',
    );
  }
  if (name === 'NotReadableError' || /could not start|in use|hardware|track start/i.test(message)) {
    return base(
      `Your ${dev} is being used by another app (e.g. WhatsApp, Instagram, another browser tab, or the Zoom app).`,
      `Close every other app / tab that might be using the ${dev} — including background apps in the recent-apps tray — then tap Retry. On Vivo you may also need to force-stop the browser and re-open this link.`,
      name || 'NotReadableError',
    );
  }
  if (name === 'OverconstrainedError' || /constrain/i.test(message)) {
    return base(
      `The requested ${dev} settings aren't supported by this device.`,
      `Tap Retry — we'll ask for default settings. If it still fails, switch to a different camera in your browser's site settings.`,
      name || 'OverconstrainedError',
    );
  }
  if (name === 'SecurityError' || /secure|https/i.test(message)) {
    return base(
      `This browser only allows ${dev} access over HTTPS.`,
      `Open the app from the https:// address — not http:// or a direct IP.`,
      name || 'SecurityError',
    );
  }
  if (name === 'AbortError') {
    return base(
      `${dev} start was aborted by the system.`,
      `Retry once. If it keeps failing, restart your browser or phone.`,
      name,
    );
  }
  return base(
    message || 'Unknown media error.',
    `Try again. If it keeps failing, restart the browser or phone and re-open the invite link.`,
    name || 'Error',
  );
};

// Live microphone input level meter (0..1) driven by an AnalyserNode.
const useMicLevel = (stream: MediaStream | null) => {
  const [level, setLevel] = useState(0);
  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) { setLevel(0); return; }
    let ctx: AudioContext | null = null;
    let raf = 0;
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      src.connect(analyser);
      const buf = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteTimeDomainData(buf);
        let peak = 0;
        for (let i = 0; i < buf.length; i++) {
          const v = Math.abs(buf[i] - 128) / 128;
          if (v > peak) peak = v;
        }
        setLevel(peak);
        raf = requestAnimationFrame(tick);
      };
      tick();
    } catch {}
    return () => { cancelAnimationFrame(raf); try { ctx?.close(); } catch {} };
  }, [stream]);
  return level;
};

const LevelBar = ({ value, label }: { value: number; label?: string }) => (
  <div className="w-full">
    {label && <div className="text-[10px] text-muted-foreground mb-0.5">{label}</div>}
    <div className="w-full h-2 rounded bg-secondary overflow-hidden">
      <div
        className={cn('h-full transition-all', value > 0.6 ? 'bg-destructive' : value > 0.15 ? 'bg-emerald-500' : 'bg-amber-500')}
        style={{ width: `${Math.min(100, Math.round(value * 140))}%` }}
      />
    </div>
  </div>
);

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
  const [pinnedPeerId, setPinnedPeerId] = useState<string | null>(null);
  const [guestId] = useState<string>(() => getGuestId());
  const [guestName, setGuestName] = useState<string>(() => {
    try { return localStorage.getItem('biro-guest-name') || 'Guest'; } catch { return 'Guest'; }
  });
  const [chatOpen, setChatOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    // Default: open on desktop, collapsed on mobile
    return window.matchMedia('(min-width: 1024px)').matches;
  });
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditRows, setAuditRows] = useState<Array<{ id: string; action: string; target_name: string | null; created_at: string; metadata: any }>>([]);
  const [auditFilter, setAuditFilter] = useState<string>('all');
  const [auditSearch, setAuditSearch] = useState('');
  const [bandwidthMode, setBandwidthMode] = useState<'auto' | 'low' | 'normal' | 'high'>(() => {
    try { return (localStorage.getItem('biro-bw-mode') as any) || 'auto'; } catch { return 'auto'; }
  });
  useEffect(() => { try { localStorage.setItem('biro-bw-mode', bandwidthMode); } catch {} }, [bandwidthMode]);
  const [unreadChat, setUnreadChat] = useState(0);
  // Media error dialog — shows reason + fix + retry buttons on getUserMedia failures
  const [mediaError, setMediaError] = useState<{ kind: MediaErrKind; info: MediaErrInfo; retry: () => Promise<void> } | null>(null);
  // Host-issued turn-on requests that couldn't be honored automatically (device
  // has no live track). Cleared once the user grants the ask via a button tap.
  const [pendingHostRequest, setPendingHostRequest] = useState<{ mic?: boolean; cam?: boolean }>({});
  const [isRestoring, setIsRestoring] = useState(false);
  // Diagnostics + preflight
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagRows, setDiagRows] = useState<Array<any>>([]);
  const [preflightOpen, setPreflightOpen] = useState(false);
  const [preflightStream, setPreflightStream] = useState<MediaStream | null>(null);
  const [preflightResult, setPreflightResult] = useState<{
    mic: 'pending' | 'ok' | 'fail' | 'silent';
    cam: 'pending' | 'ok' | 'fail';
    net: 'pending' | 'ok' | 'fail';
    micErr?: string; camErr?: string; netErr?: string;
  }>({ mic: 'pending', cam: 'pending', net: 'pending' });
  const preflightVideoRef = useRef<HTMLVideoElement>(null);
  const preflightMicLevel = useMicLevel(preflightStream);
  const liveMicLevel = useMicLevel(callActive ? callStream : null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hostChannelRef = useRef<any>(null);

  // Unified identity — auth users use their UUID, guests use device-stable id
  const selfId = user?.id ?? guestId;
  const selfName = user ? (profile.name || 'Student') : guestName;

  const { peers, getDiagnostics } = useWebRTCMesh({
    // Key on room CODE so auth users and guests join the same mesh
    roomKey: activeRoom?.code ?? null,
    selfUserId: selfId,
    selfName,
    localStream: callStream,
    enabled: callActive && !!activeRoom,
    bandwidthMode,
  });

  // Poll diagnostics while dialog is open
  useEffect(() => {
    if (!diagOpen) return;
    let cancelled = false;
    const tick = async () => {
      const rows = await getDiagnostics();
      if (!cancelled) setDiagRows(rows);
    };
    void tick();
    const iv = setInterval(tick, 2000);
    return () => { cancelled = true; clearInterval(iv); };
  }, [diagOpen, getDiagnostics]);

  // Toast on reconnect transitions
  const prevReconnectRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const now = new Set(peers.filter((p) => p.reconnecting).map((p) => p.peerId));
    peers.forEach((p) => {
      const was = prevReconnectRef.current.has(p.peerId);
      const is = now.has(p.peerId);
      if (!was && is) toast({ title: `Reconnecting to ${p.name}…` });
      if (was && !is && p.connectionState === 'connected') toast({ title: `Reconnected to ${p.name}` });
    });
    prevReconnectRef.current = now;
  }, [peers]);

  // Overall self connection health = worst peer state (or 'connected' if no peers yet)
  const overallConn: RTCPeerConnectionState = (() => {
    if (!callActive) return 'new';
    if (peers.length === 0) return 'connecting';
    const states = peers.map((p) => p.connectionState || 'new');
    if (states.some((s) => s === 'failed' || s === 'closed')) return 'failed';
    if (states.some((s) => s === 'disconnected')) return 'disconnected';
    if (states.every((s) => s === 'connected')) return 'connected';
    return 'connecting';
  })();

  // Persist spotlight selection per room
  const spotlightKey = activeRoom ? `biro-spotlight-${activeRoom.code}` : '';
  useEffect(() => {
    if (!activeRoom) return;
    try {
      const saved = localStorage.getItem(spotlightKey);
      if (saved) setPinnedPeerId(saved);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.code]);
  useEffect(() => {
    if (!spotlightKey) return;
    try {
      if (pinnedPeerId) localStorage.setItem(spotlightKey, pinnedPeerId);
      else localStorage.removeItem(spotlightKey);
    } catch {}
  }, [pinnedPeerId, spotlightKey]);
  // Auto-unpin if pinned peer left the mesh
  useEffect(() => {
    if (pinnedPeerId && !peers.some((p) => p.peerId === pinnedPeerId)) setPinnedPeerId(null);
  }, [peers, pinnedPeerId]);

  // Track unread chat messages while panel is closed
  useEffect(() => {
    if (chatOpen) setUnreadChat(0);
  }, [chatOpen, messages.length]);

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
      const info = explainMediaError(error, 'both');
      setMediaError({ kind: 'both', info, retry: startCall });
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
    if (!activeRoom) return;
    // Unified live channel keyed on room CODE so guests + auth users share presence,
    // chat notifications, host broadcasts, and meeting-ended events.
    const channel = supabase.channel(`study-room-live-${activeRoom.code}`, {
      config: { presence: { key: selfId } },
    });
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
      .on('broadcast', { event: 'meeting-ended' }, () => {
        toast({ title: 'Meeting ended', description: 'The host ended this study room.' });
        void leaveRoom();
      })
      .on('broadcast', { event: 'force-mute' }, ({ payload }: any) => {
        if (payload?.target !== selfId && payload?.target !== '*') return;
        if (user && user.id === activeRoom.owner_id) return; // host exempt
        streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
        callStream?.getAudioTracks().forEach((t) => (t.enabled = false));
        setMicOn(false);
        toast({ title: 'Muted by host', variant: 'destructive' });
      })
      .on('broadcast', { event: 'force-cam-off' }, ({ payload }: any) => {
        if (payload?.target !== selfId && payload?.target !== '*') return;
        if (user && user.id === activeRoom.owner_id) return; // host exempt
        streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
        callStream?.getVideoTracks().forEach((t) => (t.enabled = false));
        setCameraOn(false);
        toast({ title: 'Camera turned off by host', variant: 'destructive' });
      })
      .on('broadcast', { event: 'request-mic-on' }, ({ payload }: any) => {
        if (payload?.target !== selfId && payload?.target !== '*') return;
        if (user && user.id === activeRoom.owner_id) return;
        const tracks = callStream?.getAudioTracks() || streamRef.current?.getAudioTracks() || [];
        const live = tracks.filter((t) => t.readyState === 'live');
        if (live.length) {
          tracks.forEach((t) => (t.enabled = true));
          setMicOn(true);
          setPendingHostRequest((p) => ({ ...p, mic: false }));
          toast({ title: 'Host asked you to unmute — mic is on' });
        } else {
          setPendingHostRequest((p) => ({ ...p, mic: true }));
          toast({ title: 'Host is asking you to unmute', description: 'Tap the Mic button to turn it on.' });
        }
      })
      .on('broadcast', { event: 'request-cam-on' }, ({ payload }: any) => {
        if (payload?.target !== selfId && payload?.target !== '*') return;
        if (user && user.id === activeRoom.owner_id) return;
        const tracks = callStream?.getVideoTracks() || streamRef.current?.getVideoTracks() || [];
        const live = tracks.filter((t) => t.readyState === 'live');
        if (live.length) {
          tracks.forEach((t) => (t.enabled = true));
          setCameraOn(true);
          setPendingHostRequest((p) => ({ ...p, cam: false }));
          toast({ title: 'Host asked you to turn camera on — camera is on' });
        } else {
          setPendingHostRequest((p) => ({ ...p, cam: true }));
          toast({ title: 'Host is asking you to turn on camera', description: 'Tap the Camera button to enable it.' });
        }
      })
      .on('broadcast', { event: 'kick' }, ({ payload }: any) => {
        if (payload?.target !== selfId) return;
        toast({ title: 'Removed by host', description: payload?.banned ? 'You were banned from this room.' : 'You were removed.', variant: 'destructive' });
        void leaveRoom();
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: selfName,
            avatar: user ? (profile.avatar || '👤') : '👥',
            joinedAt: Date.now(),
            isGuest: !user,
          });
        }
      });
    hostChannelRef.current = channel;
    return () => { channel.untrack(); supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRoom?.code, selfId, selfName]);

  // Separate postgres-changes listener for chat messages (auth users only)
  useEffect(() => {
    if (!activeRoom || !user || isGuestRoom) return;
    const ch = supabase.channel(`study-room-msgs-${activeRoom.id}`);
    ch.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'study_room_messages', filter: `room_id=eq.${activeRoom.id}` }, async (payload: any) => {
      const { data: prof } = await supabase.from('profiles').select('name').eq('user_id', payload.new.sender_id).maybeSingle();
      setMessages(prev => {
        if (prev.some(m => m.id === payload.new.id)) return prev;
        // Bump unread if chat panel is closed and message is from someone else
        if (!chatOpen && payload.new.sender_id !== user.id) setUnreadChat((n) => n + 1);
        return [...prev, { ...payload.new, sender_name: prof?.name || 'Student' }];
      });
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [activeRoom, user, isGuestRoom, chatOpen]);

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

  // (guest listener merged into unified live channel above)

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
    setConfirmEndOpen(true);
  };

  const doEndMeeting = async () => {
    if (!activeRoom || !isOwner) return;
    setConfirmEndOpen(false);
    try {
      await hostChannelRef.current?.send({ type: 'broadcast', event: 'meeting-ended', payload: {} });
    } catch {}
    await supabase.from('study_rooms').update({ is_active: false }).eq('id', activeRoom.id);
    await logAudit('end_meeting');
    toast({ title: 'Meeting ended for everyone' });
    await leaveRoom();
  };

  const logAudit = async (action: string, target?: RoomUser | null, metadata: any = {}) => {
    if (!isOwner || !activeRoom || !user) return;
    if (activeRoom.id.startsWith('guest-')) return;
    try {
      await supabase.from('study_room_audit_log').insert({
        room_id: activeRoom.id,
        host_id: user.id,
        action,
        target_id: target?.id ?? null,
        target_name: target?.name ?? null,
        metadata,
      });
    } catch {}
  };

  const openAuditLog = async () => {
    if (!isOwner || !activeRoom) return;
    setAuditOpen(true);
    const { data } = await supabase.from('study_room_audit_log').select('id,action,target_name,created_at,metadata').eq('room_id', activeRoom.id).order('created_at', { ascending: false }).limit(100);
    setAuditRows((data as any[]) || []);
  };

  const filteredAuditRows = auditRows.filter((r) => {
    if (auditFilter !== 'all' && r.action !== auditFilter) return false;
    if (auditSearch.trim()) {
      const q = auditSearch.trim().toLowerCase();
      const hay = `${r.action} ${r.target_name || ''} ${JSON.stringify(r.metadata || {})}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const exportAuditCsv = () => {
    const rows = filteredAuditRows;
    const header = ['timestamp', 'action', 'target', 'metadata'];
    const csvEscape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const lines = [header.join(',')];
    rows.forEach((r) => {
      lines.push([
        csvEscape(new Date(r.created_at).toISOString()),
        csvEscape(r.action),
        csvEscape(r.target_name || ''),
        csvEscape(JSON.stringify(r.metadata || {})),
      ].join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `host-audit-${activeRoom?.code || 'room'}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportAuditJson = () => {
    const payload = {
      room_code: activeRoom?.code,
      room_title: activeRoom?.title,
      exported_at: new Date().toISOString(),
      filter: { action: auditFilter, search: auditSearch || null },
      count: filteredAuditRows.length,
      rows: filteredAuditRows.map((r) => ({
        id: r.id,
        timestamp: new Date(r.created_at).toISOString(),
        action: r.action,
        target: r.target_name || null,
        metadata: r.metadata || {},
      })),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `host-audit-${activeRoom?.code || 'room'}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---- One-click preflight self-test ----
  const stopPreflight = useCallback(() => {
    preflightStream?.getTracks().forEach((t) => t.stop());
    setPreflightStream(null);
  }, [preflightStream]);

  const runPreflight = async () => {
    setPreflightOpen(true);
    setPreflightResult({ mic: 'pending', cam: 'pending', net: 'pending' });
    // Mic + Cam
    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setPreflightStream(stream);
      if (preflightVideoRef.current) preflightVideoRef.current.srcObject = stream;
      setPreflightResult((r) => ({ ...r, cam: stream!.getVideoTracks().length > 0 ? 'ok' : 'fail', mic: stream!.getAudioTracks().length > 0 ? 'ok' : 'fail' }));
    } catch (e: any) {
      setPreflightResult((r) => ({ ...r, cam: 'fail', mic: 'fail', camErr: e?.message, micErr: e?.message }));
    }
    // After ~3s check if any mic level detected
    setTimeout(() => {
      setPreflightResult((r) => {
        if (r.mic !== 'ok') return r;
        return { ...r, mic: preflightMicLevel > 0.02 ? 'ok' : 'silent' };
      });
    }, 3200);
    // Network / ICE reachability
    try {
      const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      pc.createDataChannel('probe');
      const gathered: string[] = [];
      pc.onicecandidate = (ev) => { if (ev.candidate) gathered.push(ev.candidate.candidate); };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 4000);
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); resolve(); } };
      });
      const hasSrflx = gathered.some((c) => c.includes(' srflx '));
      pc.close();
      setPreflightResult((r) => ({ ...r, net: hasSrflx ? 'ok' : 'fail', netErr: hasSrflx ? undefined : 'No STUN reflexive candidate — NAT/firewall may block WebRTC.' }));
    } catch (e: any) {
      setPreflightResult((r) => ({ ...r, net: 'fail', netErr: e?.message }));
    }
  };

  useEffect(() => {
    // Once mic level is confirmed non-silent, upgrade result live
    if (!preflightOpen) return;
    if (preflightResult.mic === 'silent' && preflightMicLevel > 0.02) {
      setPreflightResult((r) => ({ ...r, mic: 'ok' }));
    }
  }, [preflightMicLevel, preflightOpen, preflightResult.mic]);

  useEffect(() => {
    if (!preflightOpen) stopPreflight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preflightOpen]);

  const hostBroadcast = async (event: string, payload: any) => {
    const ch = hostChannelRef.current;
    if (!ch) return;
    try { await ch.send({ type: 'broadcast', event, payload }); } catch {}
  };

  const muteMember = async (target: RoomUser) => {
    if (!isOwner) return;
    await hostBroadcast('force-mute', { target: target.id });
    await logAudit('mute', target);
    toast({ title: `Muted ${target.name}` });
  };

  const camOffMember = async (target: RoomUser) => {
    if (!isOwner) return;
    await hostBroadcast('force-cam-off', { target: target.id });
    await logAudit('cam_off', target);
    toast({ title: `Cam off ${target.name}` });
  };

  const muteAll = async () => {
    if (!isOwner) return;
    await hostBroadcast('force-mute', { target: '*' });
    await logAudit('mute_all');
    toast({ title: 'Muted everyone' });
  };

  const camOffAll = async () => {
    if (!isOwner) return;
    await hostBroadcast('force-cam-off', { target: '*' });
    await logAudit('cam_off_all');
    toast({ title: 'Cameras off for everyone' });
  };

  const unmuteMember = async (target: RoomUser) => {
    if (!isOwner) return;
    await hostBroadcast('request-mic-on', { target: target.id });
    await logAudit('unmute', target);
    toast({ title: `Asked ${target.name} to unmute` });
  };

  const camOnMember = async (target: RoomUser) => {
    if (!isOwner) return;
    await hostBroadcast('request-cam-on', { target: target.id });
    await logAudit('cam_on', target);
    toast({ title: `Asked ${target.name} to turn camera on` });
  };

  const unmuteAll = async () => {
    if (!isOwner) return;
    await hostBroadcast('request-mic-on', { target: '*' });
    await logAudit('unmute_all');
    toast({ title: 'Asked everyone to unmute' });
  };

  const camOnAll = async () => {
    if (!isOwner) return;
    await hostBroadcast('request-cam-on', { target: '*' });
    await logAudit('cam_on_all');
    toast({ title: 'Asked everyone to turn cameras on' });
  };

  const kickMember = async (target: RoomUser) => {
    if (!isOwner || !activeRoom) return;
    await hostBroadcast('kick', { target: target.id, banned: false });
    await supabase.from('study_room_members').delete().eq('room_id', activeRoom.id).eq('user_id', target.id);
    await logAudit('kick', target);
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
    await logAudit('ban', banTarget, { scope: banScope, duration: banDuration, reason: banReason.trim() || null });
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
        const anyLive = videoTracks.some((t) => t.readyState === 'live');
        if (videoTracks.length && anyLive) {
          videoTracks.forEach((t) => (t.enabled = !cameraOn));
          setCameraOn(!cameraOn);
          if (!cameraOn) setPendingHostRequest((p) => ({ ...p, cam: false }));
          return;
        }
        // No live video track — acquire one and add to the call stream
        if (!cameraOn) {
          const fresh = await navigator.mediaDevices.getUserMedia({ video: true });
          fresh.getVideoTracks().forEach((t) => {
            // remove any dead track first
            callStream.getVideoTracks().forEach((old) => { try { callStream.removeTrack(old); } catch {} });
            callStream.addTrack(t);
          });
          setCallStream(new MediaStream(callStream.getTracks()));
          setCameraOn(true);
          setPendingHostRequest((p) => ({ ...p, cam: false }));
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
      setPendingHostRequest((p) => ({ ...p, cam: false }));
    } catch (error) {
      setMediaError({ kind: 'camera', info: explainMediaError(error, 'camera'), retry: toggleCamera });
    }
  };

  const toggleMic = async () => {
    try {
      if (callActive && callStream) {
        const audioTracks = callStream.getAudioTracks();
        const anyLive = audioTracks.some((t) => t.readyState === 'live');
        if (audioTracks.length && anyLive) {
          audioTracks.forEach((t) => (t.enabled = !micOn));
          setMicOn(!micOn);
          if (!micOn) setPendingHostRequest((p) => ({ ...p, mic: false }));
          return;
        }
        if (!micOn) {
          const fresh = await navigator.mediaDevices.getUserMedia({ audio: true });
          fresh.getAudioTracks().forEach((t) => {
            callStream.getAudioTracks().forEach((old) => { try { callStream.removeTrack(old); } catch {} });
            callStream.addTrack(t);
          });
          setCallStream(new MediaStream(callStream.getTracks()));
          setMicOn(true);
          setPendingHostRequest((p) => ({ ...p, mic: false }));
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
      setPendingHostRequest((p) => ({ ...p, mic: false }));
    } catch (error) {
      setMediaError({ kind: 'mic', info: explainMediaError(error, 'mic'), retry: toggleMic });
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
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground">{activeRoom.code}</p>
                {callActive && <ConnBadge state={overallConn} />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setChatOpen((v) => !v)}
              className="gap-1 relative lg:hidden"
              aria-label="Toggle chat"
            >
              <MessageSquare className="w-3 h-3" /> Chat
              {unreadChat > 0 && !chatOpen && (
                <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[9px] rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={shareInviteLink} className="gap-1"><Share2 className="w-3 h-3" /> Share</Button>
            <Button variant="outline" size="sm" onClick={copyId} className="gap-1"><Copy className="w-3 h-3" /> ID</Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1" aria-label="Bandwidth"><Gauge className="w-3 h-3" /> <span className="hidden sm:inline capitalize">{bandwidthMode}</span></Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="end">
                <p className="text-[11px] text-muted-foreground mb-1 px-1">Video quality</p>
                {(['auto','high','normal','low'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setBandwidthMode(m)}
                    className={cn('w-full text-left text-xs rounded px-2 py-1.5 hover:bg-secondary flex items-center justify-between', bandwidthMode === m && 'bg-secondary font-semibold')}
                  >
                    <span className="capitalize">{m}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {m === 'auto' ? 'Adapt' : m === 'high' ? '~1.5 Mb/s' : m === 'normal' ? '~600 kb/s' : '~150 kb/s'}
                    </span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
            {isOwner && <Button variant="outline" size="sm" onClick={openAuditLog} className="gap-1 hidden sm:inline-flex"><ScrollText className="w-3 h-3" /> Log</Button>}
            <Button variant="outline" size="sm" onClick={runPreflight} className="gap-1 hidden sm:inline-flex" title="Run a mic / camera / network self-test"><Stethoscope className="w-3 h-3" /> Test</Button>
            {callActive && <Button variant="outline" size="sm" onClick={() => setDiagOpen(true)} className="gap-1 hidden sm:inline-flex" title="Network diagnostics"><Activity className="w-3 h-3" /> Diag</Button>}
            {isOwner && <Button variant="destructive" size="sm" onClick={endMeeting} className="gap-1"><XCircle className="w-3 h-3" /> End</Button>}
          </div>
        </div>

        <div className={cn('flex-1 grid min-h-0', chatOpen ? 'lg:grid-cols-[1fr_340px]' : 'lg:grid-cols-1')}>
          <div className="p-4 space-y-4 min-h-0 flex flex-col">
            {/* Zoom-style spotlight: big pinned tile + horizontal strip of others */}
            {(() => {
              const pinnedPeer = pinnedPeerId ? peers.find(p => p.peerId === pinnedPeerId) : null;
              const showLocalLarge = !pinnedPeer;
              const stripPeers = pinnedPeer ? peers.filter(p => p.peerId !== pinnedPeer.peerId) : peers;
              return (
                <>
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-secondary/40 border border-border">
                    {showLocalLarge ? (
                      <>
                        <video ref={videoRef} autoPlay muted playsInline className={cn('w-full h-full object-cover', !cameraOn && !screenOn && 'hidden')} />
                        {!cameraOn && !screenOn && (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <VideoOff className="w-14 h-14 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Camera off</p>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 bg-primary/70 rounded px-2 py-0.5 text-xs">{selfName} (you)</div>
                      </>
                    ) : (
                      <RemoteVideoTile peer={pinnedPeer!} large onPin={() => setPinnedPeerId(null)} pinned />
                    )}
                    <div className="absolute top-3 left-3 bg-background/80 rounded-lg px-3 py-1 font-mono text-sm">
                      {Math.floor(studySeconds / 3600).toString().padStart(2, '0')}:{Math.floor((studySeconds % 3600) / 60).toString().padStart(2, '0')}:{(studySeconds % 60).toString().padStart(2, '0')}
                    </div>
                  </div>
                  {/* Strip of other participants */}
                  {(stripPeers.length > 0 || pinnedPeer) && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {pinnedPeer && (
                        <div className="w-40 shrink-0">
                          <LocalVideoTile
                            stream={cameraOn || screenOn ? (callStream || streamRef.current) : null}
                            name={selfName}
                            onPin={() => setPinnedPeerId(null)}
                          />
                        </div>
                      )}
                      {stripPeers.map((p) => (
                        <div key={p.peerId} className="w-40 shrink-0">
                          <RemoteVideoTile
                            peer={p}
                            onPin={() => setPinnedPeerId(p.peerId === pinnedPeerId ? null : p.peerId)}
                            pinned={p.peerId === pinnedPeerId}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}

            <div className="grid grid-cols-3 gap-2">
              <Button variant={cameraOn ? 'default' : 'outline'} onClick={toggleCamera} className="gap-2">{cameraOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />} Camera</Button>
              <Button variant={micOn ? 'default' : 'outline'} onClick={toggleMic} className="gap-2">{micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />} Mic</Button>
              <Button variant={screenOn ? 'default' : 'outline'} onClick={toggleScreen} className="gap-2"><Monitor className="w-4 h-4" /> Screen</Button>
            </div>

            {callActive && micOn && (
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <Mic className="w-3 h-3 shrink-0" />
                <LevelBar value={liveMicLevel} />
                <span className="w-8 text-right tabular-nums">{Math.round(liveMicLevel * 100)}%</span>
              </div>
            )}

            <div className="grid grid-cols-1">
              {callActive ? (
                <Button variant="destructive" onClick={endCall} className="gap-2"><PhoneOff className="w-4 h-4" /> End Live Call</Button>
              ) : (
                <Button onClick={startCall} className="bg-emerald-500 hover:bg-emerald-600 text-white gap-2"><PhoneCall className="w-4 h-4" /> Join Live Video Call</Button>
              )}
            </div>

            {callActive && peers.length === 0 && (
              <div className="text-center text-xs text-muted-foreground py-2">Waiting for others to join the call…</div>
            )}

            {isOwner && (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={muteAll} className="gap-1 text-xs"><MicOff className="w-3.5 h-3.5" /> Mute all</Button>
                <Button variant="outline" size="sm" onClick={camOffAll} className="gap-1 text-xs"><VideoOff className="w-3.5 h-3.5" /> Cams off all</Button>
                <Button variant="outline" size="sm" onClick={unmuteAll} className="gap-1 text-xs"><Mic className="w-3.5 h-3.5" /> Unmute all</Button>
                <Button variant="outline" size="sm" onClick={camOnAll} className="gap-1 text-xs"><Video className="w-3.5 h-3.5" /> Cams on all</Button>
              </div>
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
                        <button onClick={() => unmuteMember(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2"><Mic className="w-3.5 h-3.5" /> Ask to unmute</button>
                        <button onClick={() => camOffMember(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2"><VideoOff className="w-3.5 h-3.5" /> Turn off cam</button>
                        <button onClick={() => camOnMember(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2"><Video className="w-3.5 h-3.5" /> Ask to turn on cam</button>
                        <button onClick={() => kickMember(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2 text-orange-500"><UserX className="w-3.5 h-3.5" /> Kick</button>
                        <button onClick={() => setBanTarget(ru)} className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary flex items-center gap-2 text-destructive"><Ban className="w-3.5 h-3.5" /> Ban…</button>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
              ))}
            </div>
          </div>

          <aside
            className={cn(
              'border-l border-border bg-card/95 backdrop-blur-xl min-h-0 flex-col',
              // Desktop: inline column that shows/hides
              chatOpen ? 'lg:flex' : 'lg:hidden',
              // Mobile: full-screen overlay slide-in
              chatOpen ? 'fixed inset-0 top-[57px] z-40 flex lg:static' : 'hidden',
            )}
          >
            <div className="p-3 border-b border-border flex items-center justify-between"><span className="font-game text-sm">Room Chat</span><span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" /> {roomUsers.length}</span></div>
            <div className="lg:hidden px-3 pb-2">
              <Button variant="ghost" size="sm" onClick={() => setChatOpen(false)} className="w-full gap-2 text-xs"><XCircle className="w-3 h-3" /> Close chat</Button>
            </div>
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

        <AlertDialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2"><XCircle className="w-4 h-4 text-destructive" /> End meeting for everyone?</AlertDialogTitle>
              <AlertDialogDescription>
                All participants (including guests) will be disconnected immediately. This room will be marked ended.
                {roomUsers.length > 1 && <> {roomUsers.length - 1} other participant(s) are in the room right now.</>}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep going</AlertDialogCancel>
              <AlertDialogAction onClick={doEndMeeting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">End for everyone</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><ScrollText className="w-4 h-4" /> Host action log</DialogTitle></DialogHeader>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input value={auditSearch} onChange={(e) => setAuditSearch(e.target.value)} placeholder="Search target, action, reason…" className="h-8 text-xs" />
              <div className="flex gap-2">
                <Select value={auditFilter} onValueChange={setAuditFilter}>
                  <SelectTrigger className="h-8 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="mute">Mute</SelectItem>
                    <SelectItem value="mute_all">Mute all</SelectItem>
                    <SelectItem value="cam_off">Cam off</SelectItem>
                    <SelectItem value="cam_off_all">Cam off all</SelectItem>
                    <SelectItem value="kick">Kick</SelectItem>
                    <SelectItem value="ban">Ban</SelectItem>
                    <SelectItem value="end_meeting">End meeting</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={exportAuditCsv} disabled={filteredAuditRows.length === 0} className="gap-1 h-8"><Download className="w-3 h-3" /> CSV</Button>
                <Button variant="outline" size="sm" onClick={exportAuditJson} disabled={filteredAuditRows.length === 0} className="gap-1 h-8"><Download className="w-3 h-3" /> JSON</Button>
              </div>
            </div>
            <ScrollArea className="max-h-[60vh] pr-2">
              <div className="space-y-2">
                {filteredAuditRows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">{auditRows.length === 0 ? 'No host actions logged yet.' : 'No entries match your filter.'}</p>}
                {filteredAuditRows.map((row) => (
                  <div key={row.id} className="rounded border border-border bg-secondary/30 p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold uppercase tracking-wide text-[10px] text-primary">{row.action.replace(/_/g, ' ')}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' })}</span>
                    </div>
                    {row.target_name && <p className="text-[11px] mt-0.5">Target: <span className="font-medium">{row.target_name}</span></p>}
                    {row.metadata && Object.keys(row.metadata).length > 0 && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{Object.entries(row.metadata).map(([k, v]) => `${k}: ${String(v)}`).join(' • ')}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

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

        <Dialog open={diagOpen} onOpenChange={setDiagOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Activity className="w-4 h-4" /> Network diagnostics</DialogTitle></DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-2">
              <div className="space-y-2">
                {diagRows.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No peers connected yet.</p>}
                {diagRows.map((r) => (
                  <div key={r.peerId} className="rounded border border-border bg-secondary/30 p-2 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold truncate">{r.name}</span>
                      <ConnBadge state={r.connectionState} />
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span>RTT</span><span className="text-right tabular-nums text-foreground">{r.rttMs != null ? `${Math.round(r.rttMs)} ms` : '—'}</span>
                      <span>Loss</span><span className="text-right tabular-nums text-foreground">{r.packetLossPct != null ? `${r.packetLossPct.toFixed(2)}%` : '—'}</span>
                      <span>Jitter</span><span className="text-right tabular-nums text-foreground">{r.jitterMs != null ? `${r.jitterMs.toFixed(0)} ms` : '—'}</span>
                      <span>Out</span><span className="text-right tabular-nums text-foreground">{r.outboundKbps != null ? `${r.outboundKbps} kbps` : '—'}</span>
                      <span>In</span><span className="text-right tabular-nums text-foreground">{r.inboundKbps != null ? `${r.inboundKbps} kbps` : '—'}</span>
                      <span>Audio</span><span className="text-right tabular-nums text-foreground">{r.remoteAudioLevel != null ? `${Math.round(r.remoteAudioLevel * 100)}%` : '—'}</span>
                    </div>
                    {r.remoteAudioLevel != null && <LevelBar value={r.remoteAudioLevel} />}
                  </div>
                ))}
                <p className="text-[10px] text-muted-foreground text-center pt-1">Updates every 2s • bitrate mode: <span className="capitalize">{bandwidthMode}</span></p>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        <Dialog open={preflightOpen} onOpenChange={setPreflightOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle className="flex items-center gap-2"><Stethoscope className="w-4 h-4" /> Device self-test</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="aspect-video rounded-lg overflow-hidden bg-secondary/60 border border-border">
                <video ref={preflightVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Mic className="w-3.5 h-3.5 shrink-0" />
                <LevelBar value={preflightMicLevel} />
                <span className="w-10 text-right tabular-nums">{Math.round(preflightMicLevel * 100)}%</span>
              </div>
              <div className="space-y-1.5 text-xs">
                {([
                  ['Camera', preflightResult.cam, preflightResult.camErr],
                  ['Microphone', preflightResult.mic, preflightResult.micErr],
                  ['Network (STUN)', preflightResult.net, preflightResult.netErr],
                ] as const).map(([label, state, err]) => (
                  <div key={label} className="flex items-center justify-between rounded border border-border bg-secondary/30 px-2 py-1.5">
                    <span>{label}</span>
                    <span className={cn('inline-flex items-center gap-1',
                      state === 'ok' ? 'text-emerald-500' :
                      state === 'silent' ? 'text-amber-500' :
                      state === 'fail' ? 'text-destructive' : 'text-muted-foreground')}>
                      {state === 'ok' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {state === 'silent' && <AlertTriangle className="w-3.5 h-3.5" />}
                      {state === 'fail' && <XCircle className="w-3.5 h-3.5" />}
                      {state === 'pending' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span className="capitalize">{state === 'silent' ? 'No sound detected' : state}</span>
                    </span>
                    {err && <span className="hidden">{err}</span>}
                  </div>
                ))}
                {preflightResult.netErr && <p className="text-[10px] text-muted-foreground">{preflightResult.netErr}</p>}
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setPreflightOpen(false)}>Close</Button>
              <Button onClick={runPreflight} className="gap-2"><Stethoscope className="w-4 h-4" /> Re-run</Button>
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