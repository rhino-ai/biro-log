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
import { Users, MessageCircle, Plus, Search, UserPlus, Send, ArrowLeft, Link2, Loader2, CheckCheck, MailPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const supabase = _supabase as any;

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
  | { kind: 'group'; id: string; name: string; icon: string | null; invite_code: string | null; memberCount: number; lastMessage?: string; lastAt?: string };

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
  const [joinCode, setJoinCode] = useState('');
  const [inviteTarget, setInviteTarget] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const searchAbortRef = useRef<number | null>(null);

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
        supabase.from('chat_groups').select('id,name,icon,invite_code').in('id', groupIds),
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
        .select('id,sender_id,content,created_at,read_at')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chat.id}),and(sender_id.eq.${chat.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true }).limit(250);
      if (error) toast({ title: 'Messages load failed', description: error.message, variant: 'destructive' });
      setChatMessages((data || []) as UIMessage[]);
      void supabase.from('direct_messages').update({ read_at: new Date().toISOString() }).eq('sender_id', chat.id).eq('receiver_id', user.id).is('read_at', null);
    } else {
      const { data, error } = await supabase.from('group_messages')
        .select('id,sender_id,content,created_at')
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
    if (!content || !user || !activeChat || sendingMsg) return;
    setSendingMsg(true);
    setMessageInput('');
    const tempId = `tmp-${Date.now()}`;
    const optimistic: UIMessage = { id: tempId, sender_id: user.id, content, created_at: new Date().toISOString(), pending: true };
    appendMessage(optimistic);

    const request = activeChat.kind === 'dm'
      ? supabase.from('direct_messages').insert({ sender_id: user.id, receiver_id: activeChat.id, content }).select('id,sender_id,content,created_at,read_at').single()
      : supabase.from('group_messages').insert({ group_id: activeChat.id, sender_id: user.id, content }).select('id,sender_id,content,created_at').single();

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

  const createGroup = async () => {
    if (!groupName.trim() || !user) return;
    const { data, error } = await supabase.functions.invoke('create-chat-group', { body: { name: groupName.trim(), icon: groupIcon.trim() || '👥' } });
    if (error) {
      toast({ title: 'Group create failed', description: error.message, variant: 'destructive' });
      return;
    }
    const group = data.group;
    const chat: ChatItem = { kind: 'group', id: group.id, name: group.name, icon: group.icon, invite_code: group.invite_code, memberCount: 1 };
    setShowCreateGroup(false);
    setGroupName('');
    setGroupIcon('👥');
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
      const { data: group } = await supabase.from('chat_groups').select('id,name,icon,invite_code').eq('id', data.groupId).maybeSingle();
      if (group) setActiveChat({ kind: 'group', id: group.id, name: group.name, icon: group.icon, invite_code: group.invite_code, memberCount: 1 });
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
    const link = `${window.location.origin}/friends?join=${encodeURIComponent(code)}`;
    await navigator.clipboard.writeText(link);
    toast({ title: 'Invite link copied' });
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
    const title = group ? group.name : activeChat.peer.name;
    const avatar = group ? (group.icon || '👥') : (activeChat.peer.avatar || '👤');
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between p-3 border-b border-border bg-card/95 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}><ArrowLeft className="w-5 h-5" /></Button>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-xl shrink-0">{avatar}</div>
            <div className="min-w-0">
              <h3 className="font-game text-sm truncate">{title}</h3>
              {group ? <p className="text-[10px] text-muted-foreground">{group.memberCount} members • {group.invite_code || 'code creating...'}</p> : <p className="text-[10px] text-muted-foreground">Lvl {activeChat.peer.level || 0} • {activeChat.peer.xp || 0} XP</p>}
            </div>
          </div>
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
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-3 pb-4">
            {chatMessages.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No messages yet. Say hi.</div>}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.sender_id === user?.id ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 shadow-sm border', msg.sender_id === user?.id ? 'bg-accent text-accent-foreground border-accent/40 rounded-br-sm' : 'bg-card border-border rounded-bl-sm', msg.failed && 'border-destructive text-destructive-foreground')}>
                  {msg.sender_id !== user?.id && group && <span className="text-[10px] text-muted-foreground block mb-1">~ {msg.sender_name || 'User'}</span>}
                  <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
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
          <div className="flex gap-2">
            <Input value={messageInput} onChange={(e) => setMessageInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) void sendMessage(); }} placeholder="Type a message..." className="flex-1 bg-secondary/50" />
            <Button onClick={sendMessage} disabled={!messageInput.trim() || sendingMsg} size="icon" className="bg-accent shrink-0">{sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}</Button>
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
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name..." className="bg-secondary/50" />
                  <Input value={groupIcon} onChange={(e) => setGroupIcon(e.target.value)} placeholder="Icon emoji" className="bg-secondary/50" maxLength={16} />
                  <Button onClick={createGroup} className="w-full bg-primary" disabled={!groupName.trim()}>Create Group</Button>
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
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl shrink-0">{chat.kind === 'group' ? (chat.icon || '👥') : (chat.peer.avatar || '👤')}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{chat.kind === 'group' ? chat.name : chat.peer.name}</h3>
                      {chat.lastMessage ? <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p> : chat.kind === 'group' ? <p className="text-xs text-muted-foreground">{chat.memberCount} members • {chat.invite_code || 'Invite ready soon'}</p> : <p className="text-xs text-muted-foreground">{chat.peer.unique_id || 'DM'} • Lvl {chat.peer.level || 0}</p>}
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