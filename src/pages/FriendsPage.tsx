import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { FriendInvite } from '@/components/game/FriendInvite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, MessageCircle, Plus, Search, UserPlus, Send, ArrowLeft, Link2, Loader2, CheckCheck, MailPlus, Paperclip, FileIcon, X as XIcon, Info, Camera, ShieldCheck, Shield } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { GroupInfoPanel } from '@/components/chat/GroupInfoPanel';
import { AttachmentComposerPreview, AttachmentViewer, classify, type PreviewFile } from '@/components/chat/AttachmentPreviewPanel';
import { ensureKeypair, sharedKeyFor, encryptText, decryptText, encryptFile, decryptFile } from '@/lib/e2ee';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const supabase = _supabase as any;

// Encode/decode base64 for raw bytes.
const b64ToBytes = (b64: string): Uint8Array => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const bytesToB64 = (bytes: Uint8Array): string => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
};

type Profile = {
  user_id: string;
  name: string;
  avatar: string | null;
  level?: number | null;
  xp?: number | null;
  unique_id?: string | null;
};

type ChatItem =
  | { kind: 'dm'; id: string; peer: Profile; lastMessage?: string; lastAt?: string }
  | { kind: 'group'; id: string; name: string; icon: string | null; avatar_url: string | null; description: string | null; invite_code: string | null; memberCount: number; lastMessage?: string; lastAt?: string };

type UIMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
  sender_name?: string;
  sender_avatar?: string | null;
  pending?: boolean;
  failed?: boolean;
  attachment_url?: string | null;
  attachment_type?: string | null;
  attachment_name?: string | null;
  encrypted?: boolean;
  nonce?: string | null;
  attachment_meta?: any;
};

const isGroupChat = (chat: ChatItem): chat is Extract<ChatItem, { kind: 'group' }> => chat.kind === 'group';

const FriendsPage = () => {
  const { user, isGuest } = useAuth();
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatItem | null>(null);
  const [chatMessages, setChatMessages] = useState<UIMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupIcon, setGroupIcon] = useState('👥');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupPhotoFile, setGroupPhotoFile] = useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const groupPhotoRef = useRef<HTMLInputElement>(null);
  const [joinCode, setJoinCode] = useState('');
  const [inviteTarget, setInviteTarget] = useState('');
  const [pendingAttachment, setPendingAttachment] = useState<{ url: string; type: string; name: string } | null>(null);
  const [uploadingAttach, setUploadingAttach] = useState(false);
  const [composerPreview, setComposerPreview] = useState<PreviewFile | null>(null);
  const [composerCaption, setComposerCaption] = useState('');
  const [composerSending, setComposerSending] = useState(false);
  const [viewer, setViewer] = useState<{ url: string | null; name: string; kind: PreviewFile['kind']; loading: boolean } | null>(null);
  const [decryptedText, setDecryptedText] = useState<Record<string, string>>({});
  const [dmE2EEReady, setDmE2EEReady] = useState<boolean>(false);
  const sharedKeyRef = useRef<Uint8Array | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchAbortRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize the user's E2EE keypair once, in the background. Failure is non-fatal.
  useEffect(() => {
    if (!user) return;
    void ensureKeypair(user.id).catch(() => {});
  }, [user]);

  // When opening a DM, derive the shared key with the peer (or fall back to plaintext).
  useEffect(() => {
    sharedKeyRef.current = null;
    setDmE2EEReady(false);
    if (!user || !activeChat || activeChat.kind !== 'dm') return;
    let cancelled = false;
    void (async () => {
      const shared = await sharedKeyFor(user.id, activeChat.id).catch(() => null);
      if (cancelled) return;
      sharedKeyRef.current = shared;
      setDmE2EEReady(!!shared);
    })();
    return () => { cancelled = true; };
  }, [user, activeChat]);

  // Decrypt encrypted DM texts in the transcript as they show up.
  useEffect(() => {
    if (!activeChat || activeChat.kind !== 'dm') return;
    const shared = sharedKeyRef.current;
    if (!shared) return;
    const pending = chatMessages.filter(m => m.encrypted && m.nonce && !(m.id in decryptedText));
    if (!pending.length) return;
    void (async () => {
      const patch: Record<string, string> = {};
      for (const m of pending) {
        try { patch[m.id] = await decryptText(m.content, m.nonce as string, shared); }
        catch { patch[m.id] = '[unable to decrypt]'; }
      }
      setDecryptedText(prev => ({ ...prev, ...patch }));
    })();
  }, [chatMessages, activeChat, decryptedText]);

  const appendMessage = useCallback((message: UIMessage) => {
    setChatMessages(prev => {
      const withoutPendingTwin = prev.filter(m => !(m.pending && m.sender_id === message.sender_id && m.content === message.content));
      return withoutPendingTwin.some(m => m.id === message.id) ? withoutPendingTwin : [...withoutPendingTwin, message].slice(-250);
    });
  }, []);

  const loadChats = useCallback(async () => {
    if (!user) return;

    const { data: dms, error: dmError } = await supabase
      .from('direct_messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(500);
    if (dmError) toast({ title: 'Chats load failed', description: dmError.message, variant: 'destructive' });

    const peerMap = new Map<string, { last: string; at: string }>();
    (dms || []).forEach((m: any) => {
      const peer = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!peerMap.has(peer)) peerMap.set(peer, { last: m.content, at: m.created_at });
    });

    const { data: contactRows } = await supabase.from('contacts').select('contact_user_id').eq('user_id', user.id);
    (contactRows || []).forEach((c: any) => {
      if (!peerMap.has(c.contact_user_id)) peerMap.set(c.contact_user_id, { last: '', at: '' });
    });

    const peerIds = Array.from(peerMap.keys());
    const { data: peerProfiles } = peerIds.length
      ? await supabase.from('profiles').select('user_id,name,avatar,level,xp,unique_id').in('user_id', peerIds)
      : { data: [] as Profile[] };

    const dmItems: ChatItem[] = peerIds.map((pid) => {
      const prof = (peerProfiles || []).find((p: Profile) => p.user_id === pid) || { user_id: pid, name: 'User', avatar: null };
      const meta = peerMap.get(pid)!;
      return { kind: 'dm' as const, id: pid, peer: prof, lastMessage: meta.last, lastAt: meta.at };
    });

    const { data: myGroups } = await supabase.from('group_members').select('group_id').eq('user_id', user.id);
    const groupIds = (myGroups || []).map((g: any) => g.group_id);
    let groupItems: ChatItem[] = [];
    if (groupIds.length) {
      const [{ data: groups }, { data: members }, { data: lastMsgs }] = await Promise.all([
        supabase.from('chat_groups').select('id,name,icon,avatar_url,description,invite_code').in('id', groupIds),
        supabase.from('group_members').select('group_id,user_id').in('group_id', groupIds),
        supabase.from('group_messages').select('group_id,content,created_at').in('group_id', groupIds).order('created_at', { ascending: false }).limit(500),
      ]);

      const lastByGroup = new Map<string, { content: string; created_at: string }>();
      (lastMsgs || []).forEach((m: any) => { if (!lastByGroup.has(m.group_id)) lastByGroup.set(m.group_id, m); });

      groupItems = (groups || []).map((g: any) => ({
        kind: 'group' as const,
        id: g.id,
        name: g.name,
        icon: g.icon,
        avatar_url: g.avatar_url,
        description: g.description,
        invite_code: g.invite_code,
        memberCount: (members || []).filter((m: any) => m.group_id === g.id).length,
        lastMessage: lastByGroup.get(g.id)?.content,
        lastAt: lastByGroup.get(g.id)?.created_at,
      }));
    }

    setChats([...dmItems, ...groupItems].sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || '')));
  }, [user]);

  useEffect(() => { void loadChats(); }, [loadChats]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('chat-index-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload: any) => {
        if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) void loadChats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, () => void loadChats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => void loadChats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_groups' }, () => void loadChats())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadChats]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim();
    if (searchAbortRef.current) window.clearTimeout(searchAbortRef.current);
    if (trimmed.length < 2 || !user) { setSearchResults([]); setIsSearching(false); return; }

    setIsSearching(true);
    searchAbortRef.current = window.setTimeout(async () => {
      const { data, error } = await supabase.functions.invoke('social-search', { body: { query: trimmed } });
      if (error) {
        toast({ title: 'Search failed', description: error.message, variant: 'destructive' });
        setSearchResults([]);
      } else {
        setSearchResults(data?.results || []);
      }
      setIsSearching(false);
    }, 250);
  }, [user]);

  const startDM = async (contactUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from('contacts').upsert({ user_id: user.id, contact_user_id: contactUserId }, { onConflict: 'user_id,contact_user_id' });
    if (error) {
      toast({ title: 'Could not open chat', description: error.message, variant: 'destructive' });
      return;
    }
    const { data: prof } = await supabase.from('profiles').select('user_id,name,avatar,level,xp,unique_id').eq('user_id', contactUserId).maybeSingle();
    const peer = prof || searchResults.find((r) => r.user_id === contactUserId) || { user_id: contactUserId, name: 'User', avatar: null };
    setShowAddDialog(false);
    setActiveChat({ kind: 'dm', id: contactUserId, peer });
    setChatMessages([]);
    await loadMessages({ kind: 'dm', id: contactUserId, peer });
    void loadChats();
  };

  const loadMessages = async (chat: ChatItem) => {
    if (!user) return;
    if (chat.kind === 'dm') {
      const { data, error } = await supabase.from('direct_messages')
        .select('id,sender_id,content,created_at,read_at,attachment_url,attachment_type,attachment_name')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chat.id}),and(sender_id.eq.${chat.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true }).limit(250);
      if (error) toast({ title: 'Messages load failed', description: error.message, variant: 'destructive' });
      setChatMessages((data || []) as UIMessage[]);
      void supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('sender_id', chat.id).eq('receiver_id', user.id).is('read_at', null);
    } else {
      const { data, error } = await supabase.from('group_messages')
        .select('id,sender_id,content,created_at,attachment_url,attachment_type,attachment_name')
        .eq('group_id', chat.id)
        .order('created_at', { ascending: true }).limit(250);
      if (error) toast({ title: 'Messages load failed', description: error.message, variant: 'destructive' });
      const senderIds = Array.from(new Set((data || []).map((m: any) => m.sender_id)));
      const { data: profs } = senderIds.length
        ? await supabase.from('profiles').select('user_id,name,avatar').in('user_id', senderIds)
        : { data: [] };
      setChatMessages((data || []).map((m: any) => {
        const p = (profs || []).find((x: any) => x.user_id === m.sender_id);
        return { ...m, sender_name: p?.name, sender_avatar: p?.avatar };
      }) as UIMessage[]);
    }
  };

  const openChat = async (chat: ChatItem) => {
    setActiveChat(chat);
    setChatMessages([]);
    await loadMessages(chat);
  };

  const sendMessage = async () => {
    const content = messageInput.trim();
    if ((!content && !pendingAttachment) || !user || !activeChat || sendingMsg) return;
    setSendingMsg(true);
    setMessageInput('');
    const attachment = pendingAttachment;
    setPendingAttachment(null);
    const tempId = `tmp-${Date.now()}`;
    const optimistic: UIMessage = {
      id: tempId, sender_id: user.id, content, created_at: new Date().toISOString(), pending: true,
      attachment_url: attachment?.url ?? null, attachment_type: attachment?.type ?? null, attachment_name: attachment?.name ?? null,
    };
    appendMessage(optimistic);

    const payload: Record<string, any> = { content };
    if (attachment) {
      payload.attachment_url = attachment.url;
      payload.attachment_type = attachment.type;
      payload.attachment_name = attachment.name;
    }
    const request = activeChat.kind === 'dm'
      ? supabase.from('direct_messages').insert({ sender_id: user.id, receiver_id: activeChat.id, ...payload }).select('id,sender_id,content,created_at,read_at,attachment_url,attachment_type,attachment_name').single()
      : supabase.from('group_messages').insert({ group_id: activeChat.id, sender_id: user.id, ...payload }).select('id,sender_id,content,created_at,attachment_url,attachment_type,attachment_name').single();

    const { data, error } = await request;
    if (error) {
      setChatMessages(prev => prev.map(m => m.id === tempId ? { ...m, pending: false, failed: true } : m));
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
    } else {
      setChatMessages(prev => prev.map(m => m.id === tempId ? { ...(data as UIMessage), pending: false } : m));
      void loadChats();
    }
    setSendingMsg(false);
  };

  const handleAttach = async (file: File) => {
    if (!user) return;
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 20MB.', variant: 'destructive' });
      return;
    }
    setUploadingAttach(true);
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `chat/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('chat-uploads').upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from('chat-uploads').createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !signed) throw signErr || new Error('Failed to sign URL');
      setPendingAttachment({ url: signed.signedUrl, type: file.type || 'application/octet-stream', name: file.name });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Try again.', variant: 'destructive' });
    } finally {
      setUploadingAttach(false);
    }
  };

  const createGroup = async () => {
    if (!groupName.trim() || !user) return;
    setCreatingGroup(true);
    const { data, error } = await supabase.functions.invoke('create-chat-group', { body: { name: groupName.trim(), icon: groupIcon.trim() || '👥' } });
    if (error) {
      setCreatingGroup(false);
      toast({ title: 'Group create failed', description: error.message, variant: 'destructive' });
      return;
    }
    const group = data.group;
    let avatar_url: string | null = null;
    // Save description + photo if provided
    if (groupDesc.trim() || groupPhotoFile) {
      if (groupPhotoFile) {
        try {
          const ext = groupPhotoFile.name.split('.').pop() || 'jpg';
          const path = `chat/${user.id}/group-${group.id}-${Date.now()}.${ext}`;
          const { error: upErr } = await supabase.storage.from('chat-uploads').upload(path, groupPhotoFile, { contentType: groupPhotoFile.type, upsert: false });
          if (!upErr) {
            const { data: signed } = await supabase.storage.from('chat-uploads').createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
            avatar_url = signed?.signedUrl || null;
          }
        } catch { /* ignore */ }
      }
      await supabase.from('chat_groups').update({ description: groupDesc.trim() || null, avatar_url }).eq('id', group.id);
    }
    const chat: ChatItem = { kind: 'group', id: group.id, name: group.name, icon: group.icon, avatar_url, description: groupDesc.trim() || null, invite_code: group.invite_code, memberCount: 1 };
    setShowCreateGroup(false);
    setGroupName('');
    setGroupIcon('👥');
    setGroupDesc('');
    setGroupPhotoFile(null);
    setGroupPhotoPreview(null);
    setCreatingGroup(false);
    setActiveChat(chat);
    setChatMessages([]);
    toast({ title: 'Group created', description: `Invite code: ${group.invite_code}` });
    void loadChats();
  };

  const joinByCode = async (codeArg?: string) => {
    const code = (codeArg || joinCode).trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase.functions.invoke('join-group-by-invite', { body: { code } });
    if (error) {
      toast({ title: 'Failed to join', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Joined group', description: data?.name || code });
    setJoinCode('');
    setShowAddDialog(false);
    await loadChats();
    if (data?.groupId) {
      const { data: group } = await supabase.from('chat_groups').select('id,name,icon,avatar_url,description,invite_code').eq('id', data.groupId).maybeSingle();
      if (group) setActiveChat({ kind: 'group', id: group.id, name: group.name, icon: group.icon, avatar_url: group.avatar_url, description: group.description, invite_code: group.invite_code, memberCount: 1 });
    }
  };

  const inviteMember = async (target?: string) => {
    if (!activeChat || !isGroupChat(activeChat)) return;
    const query = (target || inviteTarget).trim();
    if (!query) return;
    const body = /^[0-9a-f-]{36}$/i.test(query) ? { groupId: activeChat.id, userId: query } : { groupId: activeChat.id, query };
    const { data, error } = await supabase.functions.invoke('invite-group-member', { body });
    if (error) {
      toast({ title: 'Invite failed', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Member added', description: data?.member?.name || 'Added to group' });
    setInviteTarget('');
    setShowInviteMember(false);
    setActiveChat(prev => prev && isGroupChat(prev) ? { ...prev, memberCount: prev.memberCount + 1 } : prev);
    void loadChats();
  };

  const copyInvite = async (code: string | null) => {
    if (!code) { toast({ title: 'Invite code missing', variant: 'destructive' }); return; }
    const link = `${window.location.origin}/join/${encodeURIComponent(code)}`;
    await navigator.clipboard.writeText(link);
    toast({ title: 'Invite link copied', description: 'Share it — recipients auto-join.' });
  };

  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      void joinByCode(code);
      window.history.replaceState({}, '', '/friends');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!user || !activeChat) return;
    let channel: any;
    if (activeChat.kind === 'dm') {
      channel = supabase.channel(`dm-${[user.id, activeChat.id].sort().join('-')}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload: any) => {
          const m = payload.new;
          const isThisConvo = (m.sender_id === user.id && m.receiver_id === activeChat.id) || (m.sender_id === activeChat.id && m.receiver_id === user.id);
          if (isThisConvo) appendMessage(m as UIMessage);
          if (m.sender_id === activeChat.id && m.receiver_id === user.id) {
            void supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('id', m.id);
          }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'direct_messages' }, (payload: any) => {
          setChatMessages(prev => prev.map(m => m.id === payload.new.id ? { ...m, read_at: payload.new.read_at } : m));
        })
        .subscribe();
    } else {
      channel = supabase.channel('group-' + activeChat.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${activeChat.id}` }, async (payload: any) => {
          const m = payload.new;
          const { data: prof } = await supabase.from('profiles').select('name,avatar').eq('user_id', m.sender_id).maybeSingle();
          appendMessage({ ...m, sender_name: prof?.name, sender_avatar: prof?.avatar } as UIMessage);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_members', filter: `group_id=eq.${activeChat.id}` }, () => {
          setActiveChat(prev => prev && isGroupChat(prev) ? { ...prev, memberCount: prev.memberCount + 1 } : prev);
        })
        .subscribe();
    }
    return () => { supabase.removeChannel(channel); };
  }, [user, activeChat, appendMessage]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [chatMessages]);

  if (isGuest) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
          <BackButton to="/" />
          <div className="glass-panel rounded-xl p-5 border border-primary/30 space-y-3 text-center">
            <Users className="w-12 h-12 mx-auto text-primary" />
            <h1 className="font-game text-lg">Real chat needs sign-in</h1>
            <p className="text-sm text-muted-foreground">Guest users can explore the app, but real DMs, groups, and invites need a verified account.</p>
            <Button className="w-full" onClick={() => window.location.assign('/auth')}>Sign in to chat</Button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (activeChat) {
    const group = isGroupChat(activeChat) ? activeChat : null;
    const dm = activeChat.kind === 'dm' ? activeChat : null;
    const title = group ? group.name : dm?.peer.name || 'Chat';
    const avatar = group ? (group.icon || '👥') : (dm?.peer.avatar || '👤');
    const groupPhoto = group?.avatar_url || null;
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/95 backdrop-blur-xl">
          <button
            className="flex items-center gap-3 min-w-0 text-left flex-1 hover:opacity-80 active:opacity-70 transition-opacity"
            onClick={() => { if (group) setShowGroupInfo(true); }}
            disabled={!group}
          >
            <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}><ArrowLeft className="w-5 h-5" /></Button>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl shrink-0 overflow-hidden">
              {groupPhoto ? <img src={groupPhoto} alt={title} className="w-full h-full object-cover" /> : avatar}
            </div>
            <div className="min-w-0">
              <h3 className="font-game text-sm truncate">{title}</h3>
              {group ? <p className="text-[10px] text-muted-foreground">{group.memberCount} members • {group.invite_code || 'code creating...'}</p> : <p className="text-[10px] text-muted-foreground">Lvl {dm?.peer.level || 0} • {dm?.peer.xp || 0} XP</p>}
            </div>
          </button>
          {group && (
            <div className="flex items-center gap-1">
              <Dialog open={showInviteMember} onOpenChange={setShowInviteMember}>
                <DialogTrigger asChild><Button variant="ghost" size="icon" title="Invite member"><MailPlus className="w-4 h-4" /></Button></DialogTrigger>
                <DialogContent className="glass-panel border-primary/30">
                  <DialogHeader><DialogTitle>Invite to {group.name}</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <Input value={inviteTarget} onChange={(e) => setInviteTarget(e.target.value)} placeholder="Biro ID, username, invite code, or exact email" className="bg-secondary/50" />
                    <Button className="w-full" onClick={() => inviteMember()} disabled={!inviteTarget.trim()}>Add member</Button>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="ghost" size="icon" onClick={() => copyInvite(group.invite_code)} title="Copy invite link"><Link2 className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" onClick={() => setShowGroupInfo(true)} title="Group info"><Info className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
        {group && (
          <GroupInfoPanel
            groupId={group.id}
            open={showGroupInfo}
            onOpenChange={setShowGroupInfo}
            onUpdated={(patch) => {
              setActiveChat(prev => prev && isGroupChat(prev) ? { ...prev, ...patch } as ChatItem : prev);
              void loadChats();
            }}
          />
        )}

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3 pb-4">
            {chatMessages.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No messages yet. Say hi.</div>}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.sender_id === user?.id ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border', msg.sender_id === user?.id ? 'bg-accent text-accent-foreground border-accent/40 rounded-br-sm' : 'bg-card border-border rounded-bl-sm', msg.failed && 'border-destructive text-destructive-foreground')}>
                  {msg.sender_id !== user?.id && group && <span className="text-[10px] text-muted-foreground block mb-1">~ {msg.sender_name || 'User'}</span>}
                  {msg.attachment_url && (() => {
                    const t = msg.attachment_type || '';
                    const n = msg.attachment_name || '';
                    const isImg = t.startsWith('image/') || /\.(png|jpe?g|gif|webp|avif|bmp|svg)$/i.test(n);
                    const isVid = t.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv)$/i.test(n);
                    const isAud = t.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(n);
                    const isPdf = t === 'application/pdf' || /\.pdf$/i.test(n);
                    if (isImg) {
                      return (
                        <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="block mb-1">
                          <img src={msg.attachment_url} alt={n || 'image'} className="max-h-64 rounded-lg object-cover" loading="lazy" />
                        </a>
                      );
                    }
                    if (isVid) {
                      return (
                        <video src={msg.attachment_url} controls playsInline preload="metadata" className="max-h-72 w-full rounded-lg mb-1 bg-black" />
                      );
                    }
                    if (isAud) {
                      return (
                        <audio src={msg.attachment_url} controls preload="metadata" className="w-full mb-1" />
                      );
                    }
                    if (isPdf) {
                      return (
                        <div className="mb-1 space-y-1">
                          <object data={msg.attachment_url} type="application/pdf" className="w-64 h-80 rounded-lg border border-border bg-background/40">
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 rounded-lg bg-background/40 border border-border text-xs">
                              <FileIcon className="w-4 h-4 shrink-0" />
                              <span className="truncate">{n || 'PDF'}</span>
                            </a>
                          </object>
                          <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-[10px] underline opacity-70">Open {n || 'PDF'}</a>
                        </div>
                      );
                    }
                    return (
                      <a href={msg.attachment_url} target="_blank" rel="noreferrer" download={n || undefined} className="flex items-center gap-2 mb-1 p-2 rounded-lg bg-background/40 border border-border text-xs">
                        <FileIcon className="w-4 h-4 shrink-0" />
                        <span className="truncate">{n || 'File'}</span>
                      </a>
                    );
                  })()}
                  {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                  <span className="text-[10px] opacity-60 flex justify-end items-center gap-1 mt-1">
                    {msg.pending ? 'Sending...' : msg.failed ? 'Failed' : new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {!group && msg.sender_id === user?.id && msg.read_at && <CheckCheck className="w-3 h-3" />}
                  </span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border bg-card/80">
          {pendingAttachment && (
            <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-secondary/60 border border-border text-xs">
              {pendingAttachment.type.startsWith('image/')
                ? <img src={pendingAttachment.url} alt="preview" className="w-10 h-10 object-cover rounded" />
                : <FileIcon className="w-4 h-4" />}
              <span className="truncate flex-1">{pendingAttachment.name}</span>
              <Button variant="ghost" size="icon" onClick={() => setPendingAttachment(null)}><XIcon className="w-4 h-4" /></Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,audio/*,video/*,.doc,.docx,.txt"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleAttach(f); e.target.value = ''; }}
            />
            <Button
              variant="ghost" size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAttach || sendingMsg}
              className="shrink-0"
              title="Attach file"
            >
              {uploadingAttach ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />}
            </Button>
            <Input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) void sendMessage(); }} placeholder="Type a message..." className="flex-1 bg-secondary/50" />
            <Button onClick={sendMessage} disabled={(!messageInput.trim() && !pendingAttachment) || sendingMsg} size="icon" className="bg-accent shrink-0">{sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
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
          <h1 className="font-game text-xl text-glow-purple">Friends</h1>
          <div className="flex gap-1">
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
              <DialogTrigger asChild><Button variant="outline" size="icon"><Users className="w-4 h-4" /></Button></DialogTrigger>
              <DialogContent className="glass-panel border-primary/30">
                <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() => groupPhotoRef.current?.click()}
                      className="relative w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-border hover:opacity-80 transition"
                    >
                      {groupPhotoPreview
                        ? <img src={groupPhotoPreview} alt="preview" className="w-full h-full object-cover" />
                        : <span className="text-3xl">{groupIcon || '👥'}</span>}
                      <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-0.5 flex items-center justify-center gap-1"><Camera className="w-3 h-3" />Photo</span>
                    </button>
                    <input
                      ref={groupPhotoRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        if (f.size > 5 * 1024 * 1024) { toast({ title: 'Max 5MB', variant: 'destructive' }); return; }
                        setGroupPhotoFile(f);
                        setGroupPhotoPreview(URL.createObjectURL(f));
                        e.target.value = '';
                      }}
                    />
                    <Input value={groupIcon} onChange={(e) => setGroupIcon(e.target.value)} placeholder="Fallback emoji (if no photo)" className="bg-secondary/50 text-center" maxLength={16} />
                  </div>
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name" className="bg-secondary/50" maxLength={64} />
                  <Textarea value={groupDesc} onChange={(e) => setGroupDesc(e.target.value)} placeholder="Describe your group (optional)" className="bg-secondary/50" maxLength={500} rows={3} />
                  <Button onClick={createGroup} className="w-full bg-primary" disabled={!groupName.trim() || creatingGroup}>
                    {creatingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Group'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild><Button variant="outline" size="icon"><UserPlus className="w-4 h-4" /></Button></DialogTrigger>
              <DialogContent className="glass-panel border-primary/30">
                <DialogHeader><DialogTitle>Add Friend / Join Group</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Group invite code (GRP...)" className="bg-secondary/50" />
                    <Button onClick={() => joinByCode()} disabled={!joinCode.trim()}>Join</Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={searchQuery} onChange={(e) => handleSearch(e.target.value)} placeholder="Search name, BR-ID, invite code, or exact email" className="pl-10" />
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {isSearching && <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>}
                    {searchResults.map((result) => (
                      <div key={result.user_id} className="flex items-center justify-between p-3 glass-panel rounded-lg">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-lg shrink-0">{result.avatar || '👤'}</div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{result.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{result.unique_id || 'No ID'} • Lvl {result.level || 0}</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => startDM(result.user_id)} className="bg-accent"><Plus className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No users found</p>}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="friends" className="space-y-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="friends" className="font-game">Chats</TabsTrigger>
            <TabsTrigger value="invite" className="font-game">Invite</TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            {chats.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">No chats yet</p>
                <p className="text-xs text-muted-foreground">Tap + to search users or create a group.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => (
                  <button key={chat.kind + chat.id} onClick={() => openChat(chat)} className="w-full glass-panel rounded-xl p-4 border border-border flex items-center gap-3 text-left hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                      {chat.kind === 'group' && chat.avatar_url
                        ? <img src={chat.avatar_url} alt={chat.name} className="w-full h-full object-cover" />
                        : (chat.kind === 'group' ? (chat.icon || '👥') : (chat.peer.avatar || '👤'))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{chat.kind === 'group' ? chat.name : chat.peer.name}</h3>
                      {chat.lastMessage
                        ? <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                        : chat.kind === 'group'
                          ? <p className="text-xs text-muted-foreground truncate">{chat.description || `${chat.memberCount} members • ${chat.invite_code || 'invite ready'}`}</p>
                          : <p className="text-xs text-muted-foreground">{chat.peer.unique_id || 'DM'} • Lvl {chat.peer.level || 0}</p>}
                    </div>
                    <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite"><FriendInvite /></TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default FriendsPage;