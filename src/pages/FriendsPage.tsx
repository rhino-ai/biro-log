import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { FriendInvite } from '@/components/game/FriendInvite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageCircle, Plus, Search, UserPlus, Send, ArrowLeft, Copy, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase = _supabase as any;
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

type Profile = { user_id: string; name: string; avatar: string | null; level?: number; xp?: number; unique_id?: string };

type ChatItem =
  | { kind: 'dm'; id: string; peer: Profile; lastMessage?: string; lastAt?: string }
  | { kind: 'group'; id: string; name: string; icon: string | null; invite_code: string; memberCount: number; lastMessage?: string; lastAt?: string };

type UIMessage = {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_name?: string;
  sender_avatar?: string | null;
};

const FriendsPage = () => {
  const { user } = useAuth();
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
  const [groupName, setGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const loadChats = useCallback(async () => {
    if (!user) return;

    // DM peers: union of senders/receivers
    const { data: dms } = await supabase
      .from('direct_messages')
      .select('sender_id, receiver_id, content, created_at')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(500);

    const peerMap = new Map<string, { last: string; at: string }>();
    (dms || []).forEach((m: any) => {
      const peer = m.sender_id === user.id ? m.receiver_id : m.sender_id;
      if (!peerMap.has(peer)) peerMap.set(peer, { last: m.content, at: m.created_at });
    });

    // Also include contacts (chats without messages yet)
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

    // Groups
    const { data: myGroups } = await supabase.from('group_members').select('group_id').eq('user_id', user.id);
    const groupIds = (myGroups || []).map((g: any) => g.group_id);
    let groupItems: ChatItem[] = [];
    if (groupIds.length) {
      const { data: groups } = await supabase.from('chat_groups').select('id,name,icon,invite_code').in('id', groupIds);
      const { data: members } = await supabase.from('group_members').select('group_id,user_id').in('group_id', groupIds);
      const { data: lastMsgs } = await supabase
        .from('group_messages')
        .select('group_id,content,created_at')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false })
        .limit(500);
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

    const merged = [...dmItems, ...groupItems].sort((a, b) => (b.lastAt || '').localeCompare(a.lastAt || ''));
    setChats(merged);
  }, [user]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // Global realtime: refresh list on any DM/group message
  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('chat-index-' + user.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload: any) => {
        if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) loadChats();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages' }, () => loadChats())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_members', filter: `user_id=eq.${user.id}` }, () => loadChats())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, loadChats]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim();
    if (trimmed.length < 2) { setSearchResults([]); return; }
    const escaped = trimmed.replace(/[%_\\]/g, (c) => `\\${c}`);
    setIsSearching(true);
    const { data } = await supabase.from('profiles')
      .select('user_id, name, avatar, xp, level, unique_id')
      .or(`name.ilike.%${escaped}%,unique_id.ilike.%${escaped}%`)
      .neq('user_id', user?.id || '').limit(10);
    setSearchResults(data || []);
    setIsSearching(false);
  }, [user]);

  const startDM = async (contactUserId: string) => {
    if (!user) return;
    await supabase.from('contacts').upsert({ user_id: user.id, contact_user_id: contactUserId }, { onConflict: 'user_id,contact_user_id' });
    const { data: prof } = await supabase.from('profiles').select('user_id,name,avatar,level,xp,unique_id').eq('user_id', contactUserId).maybeSingle();
    toast({ title: 'Chat opened ✅' });
    setShowAddDialog(false);
    setActiveChat({ kind: 'dm', id: contactUserId, peer: prof || { user_id: contactUserId, name: 'User', avatar: null } });
    setChatMessages([]);
    loadChats();
  };

  const loadMessages = async (chat: ChatItem) => {
    if (!user) return;
    if (chat.kind === 'dm') {
      const { data } = await supabase.from('direct_messages')
        .select('id,sender_id,content,created_at')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${chat.id}),and(sender_id.eq.${chat.id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true }).limit(200);
      setChatMessages((data || []) as UIMessage[]);
    } else {
      const { data } = await supabase.from('group_messages')
        .select('id,sender_id,content,created_at')
        .eq('group_id', chat.id)
        .order('created_at', { ascending: true }).limit(200);
      const senderIds = Array.from(new Set((data || []).map((m: any) => m.sender_id)));
      const { data: profs } = senderIds.length
        ? await supabase.from('profiles').select('user_id,name,avatar').in('user_id', senderIds)
        : { data: [] };
      const withNames = (data || []).map((m: any) => {
        const p = (profs || []).find((x: any) => x.user_id === m.sender_id);
        return { ...m, sender_name: p?.name, sender_avatar: p?.avatar };
      });
      setChatMessages(withNames as UIMessage[]);
    }
  };

  const openChat = async (chat: ChatItem) => {
    setActiveChat(chat);
    await loadMessages(chat);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !activeChat || sendingMsg) return;
    setSendingMsg(true);
    const content = messageInput.trim();
    let error: any = null;
    if (activeChat.kind === 'dm') {
      ({ error } = await supabase.from('direct_messages').insert({
        sender_id: user.id, receiver_id: activeChat.id, content,
      }));
    } else {
      ({ error } = await supabase.from('group_messages').insert({
        group_id: activeChat.id, sender_id: user.id, content,
      }));
    }
    if (!error) {
      setMessageInput('');
      loadMessages(activeChat);
    } else {
      toast({ title: 'Send failed', description: error.message, variant: 'destructive' });
    }
    setSendingMsg(false);
  };

  const createGroup = async () => {
    if (!groupName.trim() || !user) return;
    const { data, error } = await supabase.from('chat_groups').insert({
      name: groupName.trim(), created_by: user.id, is_public: false,
    }).select().single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id, role: 'admin' });
    toast({ title: 'Group created! 🎉' });
    setShowCreateGroup(false);
    setGroupName('');
    loadChats();
  };

  const joinByCode = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) return;
    const { data, error } = await supabase.rpc('join_group_by_invite', { _code: code });
    if (error) {
      toast({ title: 'Failed to join', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Joined group! 🎉' });
    setJoinCode('');
    setShowAddDialog(false);
    loadChats();
    void data;
  };

  const copyInvite = (code: string) => {
    const link = `${window.location.origin}/friends?join=${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: 'Invite link copied!' });
  };

  // Auto-join from ?join=CODE
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('join');
    if (code) {
      supabase.rpc('join_group_by_invite', { _code: code }).then(({ error }: any) => {
        if (!error) { toast({ title: 'Joined group! 🎉' }); loadChats(); }
        window.history.replaceState({}, '', '/friends');
      });
    }
  }, [user, loadChats]);

  useEffect(() => {
    if (!user || !activeChat) return;
    let channel: any;
    if (activeChat.kind === 'dm') {
      channel = supabase.channel('dm-' + activeChat.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload: any) => {
          const m = payload.new;
          const isThisConvo =
            (m.sender_id === user.id && m.receiver_id === activeChat.id) ||
            (m.sender_id === activeChat.id && m.receiver_id === user.id);
          if (isThisConvo) loadMessages(activeChat);
        }).subscribe();
    } else {
      channel = supabase.channel('group-' + activeChat.id)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'group_messages', filter: `group_id=eq.${activeChat.id}` }, () => {
          loadMessages(activeChat);
        }).subscribe();
    }
    return () => { supabase.removeChannel(channel); };
  }, [user, activeChat]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  // Chat view
  if (activeChat) {
    const isGroup = activeChat.kind === 'group';
    const title = isGroup ? (activeChat as any).name : (activeChat as any).peer.name;
    const avatar = isGroup ? ((activeChat as any).icon || '👥') : ((activeChat as any).peer.avatar || '👤');
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}><ArrowLeft className="w-5 h-5" /></Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl">
              {avatar}
            </div>
            <div>
              <h3 className="font-game text-sm">{title}</h3>
              {!isGroup && (activeChat as any).peer && (
                <p className="text-[10px] text-muted-foreground">
                  Lvl {(activeChat as any).peer.level || 0} • {(activeChat as any).peer.xp || 0} XP
                </p>
              )}
              {isGroup && (
                <p className="text-[10px] text-muted-foreground">{(activeChat as any).memberCount} members</p>
              )}
            </div>
          </div>
          {isGroup && (
            <Button variant="ghost" size="icon" onClick={() => copyInvite((activeChat as any).invite_code)} title="Copy invite link">
              <Link2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-4" ref={chatScrollRef}>
          <div className="space-y-3 pb-4">
            {chatMessages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">No messages yet. Say hi! 👋</div>
            )}
            {chatMessages.map((msg) => (
              <div key={msg.id} className={cn('flex', msg.sender_id === user?.id ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-3 py-2 shadow-sm',
                  msg.sender_id === user?.id ? 'bg-accent text-accent-foreground rounded-br-sm' : 'bg-card border border-white/10 rounded-bl-sm'
                )}>
                  {msg.sender_id !== user?.id && isGroup && (
                    <span className="text-[10px] text-muted-foreground block mb-1">~ {msg.sender_name || 'User'}</span>
                  )}
                  <p className="text-sm">{msg.content}</p>
                  <span className="text-[10px] opacity-40 block text-right">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-white/10 bg-card/50">
          <div className="flex gap-2">
            <Input value={messageInput} onChange={(e) => setMessageInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Type a message..." className="flex-1 bg-secondary/50" />
            <Button onClick={sendMessage} disabled={!messageInput.trim() || sendingMsg} size="icon" className="bg-accent shrink-0">
              <Send className="w-4 h-4" />
            </Button>
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
          <h1 className="font-game text-xl text-glow-purple">👥 Friends</h1>
          <div className="flex gap-1">
            <Dialog open={showCreateGroup} onOpenChange={setShowCreateGroup}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon"><Users className="w-4 h-4" /></Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-primary/30">
                <DialogHeader><DialogTitle>Create Group</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Group name..." className="bg-secondary/50" />
                  <Button onClick={createGroup} className="w-full bg-primary" disabled={!groupName.trim()}>Create Group</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon"><UserPlus className="w-4 h-4" /></Button>
              </DialogTrigger>
              <DialogContent className="glass-panel border-primary/30">
                <DialogHeader><DialogTitle>Add Friend / Join Group</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                      placeholder="Group invite code (GRP...)" className="bg-secondary/50" />
                    <Button onClick={joinByCode} disabled={!joinCode.trim()}>Join</Button>
                  </div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search by name or BR-ID..." className="pl-10" />
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {isSearching && <p className="text-sm text-muted-foreground text-center py-4">Searching...</p>}
                    {searchResults.map((result) => (
                      <div key={result.user_id} className="flex items-center justify-between p-3 glass-panel rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-lg">
                            {result.avatar || '👤'}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{result.name}</p>
                            <p className="text-xs text-muted-foreground">Lvl {result.level || 0} • {result.xp || 0} XP</p>
                          </div>
                        </div>
                        <Button size="sm" onClick={() => startDM(result.user_id)} className="bg-accent"><Plus className="w-4 h-4" /></Button>
                      </div>
                    ))}
                    {searchQuery.length >= 2 && !isSearching && searchResults.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No users found</p>
                    )}
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
                <p className="text-xs text-muted-foreground">Tap + to start a chat or use Invite tab to share your link!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chats.map((chat) => (
                  <button key={chat.kind + chat.id} onClick={() => openChat(chat)}
                    className="w-full glass-panel rounded-xl p-4 border border-white/10 flex items-center gap-3 text-left hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl">
                      {chat.kind === 'group' ? (chat.icon || '👥') : (chat.peer.avatar || '👤')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{chat.kind === 'group' ? chat.name : chat.peer.name}</h3>
                      {chat.lastMessage ? (
                        <p className="text-xs text-muted-foreground truncate">{chat.lastMessage}</p>
                      ) : chat.kind === 'group' ? (
                        <p className="text-xs text-muted-foreground">{chat.memberCount} members</p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Lvl {chat.peer.level || 0} • {chat.peer.xp || 0} XP</p>
                      )}
                    </div>
                    <MessageCircle className="w-5 h-5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invite">
            <FriendInvite />
          </TabsContent>
        </Tabs>
      </main>
      <BottomNav />
    </div>
  );
};

export default FriendsPage;
