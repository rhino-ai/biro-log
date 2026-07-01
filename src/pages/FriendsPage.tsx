import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { FriendInvite } from '@/components/game/FriendInvite';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, MessageCircle, Plus, Search, UserPlus, Send, ArrowLeft, Video, Globe, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { supabase as _supabase } from '@/integrations/supabase/client';
const supabase = _supabase as any;
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

interface ChatRoom {
  id: string;
  name: string | null;
  is_group: boolean;
  participants: { user_id: string; profile?: { name: string; avatar: string | null; level?: number; xp?: number } }[];
  otherParticipant?: { name: string; avatar: string | null; level?: number; xp?: number; user_id: string }; // Derived for 1-on-1
}

interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender_profile?: { name: string; avatar: string | null };
}

const FriendsPage = () => {
  const { user } = useAuth();
  const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeChat, setActiveChat] = useState<ChatRoom | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(async () => {
    if (!user) return;
    // Get all rooms user is in
    const { data: myParticipants } = await supabase.from('chat_room_participants').select('room_id').eq('user_id', user.id);
    if (!myParticipants || myParticipants.length === 0) {
      setChatRooms([]);
      return;
    }
    
    const roomIds = myParticipants.map(p => p.room_id);
    const { data: roomsData } = await supabase.from('chat_rooms').select('*').in('id', roomIds);
    const { data: participantsData } = await supabase.from('chat_room_participants').select('room_id, user_id').in('room_id', roomIds);
    
    if (roomsData && participantsData) {
      const allUserIds = Array.from(new Set(participantsData.map(p => p.user_id)));
      const { data: profiles } = await supabase.from('profiles').select('user_id, name, avatar, level, xp').in('user_id', allUserIds);
      
      const formattedRooms = roomsData.map(room => {
        const roomParts = participantsData.filter(p => p.room_id === room.id);
        const partsWithProfiles = roomParts.map(p => ({
          user_id: p.user_id,
          profile: profiles?.find(prof => prof.user_id === p.user_id)
        }));
        
        let otherPart = undefined;
        if (!room.is_group) {
          const other = partsWithProfiles.find(p => p.user_id !== user.id);
          if (other) {
            otherPart = {
              user_id: other.user_id,
              name: other.profile?.name || 'Unknown',
              avatar: other.profile?.avatar || null,
              level: other.profile?.level || 0,
              xp: other.profile?.xp || 0
            };
          }
        }
        
        return {
          id: room.id,
          name: room.name,
          is_group: room.is_group,
          participants: partsWithProfiles,
          otherParticipant: otherPart
        };
      });
      setChatRooms(formattedRooms);
    }
  }, [user]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    const trimmed = query.trim();
    if (trimmed.length < 3) { setSearchResults([]); return; }
    // Escape PostgREST wildcard characters so users can't enumerate via `%` or `_`.
    const escaped = trimmed.replace(/[%_\\]/g, (c) => `\\${c}`);
    setIsSearching(true);
    const { data } = await supabase.from('profiles')
      .select('user_id, name, avatar, email, xp, level')
      .or(`email.ilike.%${escaped}%,name.ilike.%${escaped}%,unique_id.ilike.%${escaped}%`)
      .neq('user_id', user?.id || '').limit(10);
    setSearchResults(data || []);
    setIsSearching(false);
  }, [user]);

  const addContact = async (contactUserId: string) => {
    if (!user) return;
    // Check if 1-on-1 chat already exists
    const existingRoom = chatRooms.find(r => !r.is_group && r.participants.some(p => p.user_id === contactUserId));
    if (existingRoom) {
      toast({ title: 'Chat already exists!' });
      setShowAddDialog(false);
      openChat(existingRoom);
      return;
    }
    
    const { data: newRoom, error: roomErr } = await supabase.from('chat_rooms').insert({ is_group: false }).select().single();
    if (roomErr || !newRoom) {
      toast({ title: 'Error', description: roomErr?.message, variant: 'destructive' });
      return;
    }
    
    await supabase.from('chat_room_participants').insert([
      { room_id: newRoom.id, user_id: user.id },
      { room_id: newRoom.id, user_id: contactUserId }
    ]);
    
    toast({ title: 'Chat started! ✅' });
    setShowAddDialog(false);
    loadRooms();
  };

  const loadMessages = async (roomId: string) => {
    const { data } = await supabase.from('chat_messages').select('*, sender_profile:profiles!chat_messages_sender_id_fkey(name, avatar)')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true }).limit(100);
    
    // Fallback manual join if fk is missing
    let messages = data as unknown as ChatMessage[] || [];
    setChatMessages(messages);
  };

  const openChat = async (room: ChatRoom) => {
    setActiveChat(room);
    await loadMessages(room.id);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !activeChat || sendingMsg) return;
    setSendingMsg(true);
    const { error } = await supabase.from('chat_messages').insert({
      room_id: activeChat.id, sender_id: user.id, content: messageInput.trim(),
    });
    if (!error) {
      setMessageInput('');
      loadMessages(activeChat.id);
    }
    setSendingMsg(false);
  };

  const createGroup = async () => {
    if (!groupName.trim() || !user) return;
    const { data, error } = await supabase.from('chat_rooms').insert({
      name: groupName.trim(), is_group: true,
    }).select().single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    await supabase.from('chat_room_participants').insert({ room_id: data.id, user_id: user.id });
    toast({ title: 'Group created! 🎉' });
    setShowCreateGroup(false);
    setGroupName('');
    loadRooms();
  };

  useEffect(() => {
    if (!user || !activeChat) return;
    const channel = supabase.channel('chat-' + activeChat.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeChat.id}` }, () => {
        loadMessages(activeChat.id);
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, activeChat]);

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatMessages]);

  // Chat view
  if (activeChat) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveChat(null)}><ArrowLeft className="w-5 h-5" /></Button>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-xl">
              {activeChat.is_group ? '👥' : activeChat.otherParticipant?.avatar || '👤'}
            </div>
            <div>
              <h3 className="font-game text-sm">{activeChat.is_group ? activeChat.name : activeChat.otherParticipant?.name || 'Friend'}</h3>
              {!activeChat.is_group && activeChat.otherParticipant && (
                <p className="text-[10px] text-muted-foreground">
                  Lvl {activeChat.otherParticipant.level} • {activeChat.otherParticipant.xp} XP
                </p>
              )}
            </div>
          </div>
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
                  {msg.sender_id !== user?.id && activeChat.is_group && (
                    <span className="text-[10px] text-muted-foreground block mb-1">~ {msg.sender_profile?.name || 'User'}</span>
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
                <DialogHeader><DialogTitle>Add Friend</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                      placeholder="Search by name, email, or ID..." className="pl-10" />
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
                        <Button size="sm" onClick={() => addContact(result.user_id)} className="bg-accent"><Plus className="w-4 h-4" /></Button>
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
            <TabsTrigger value="friends" className="font-game">Friends</TabsTrigger>
            <TabsTrigger value="invite" className="font-game">Invite</TabsTrigger>
          </TabsList>

          <TabsContent value="friends">
            {chatRooms.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">No chats yet</p>
                <p className="text-xs text-muted-foreground">Tap + to start a chat or use Invite tab to share your link!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chatRooms.map((room) => (
                  <button key={room.id} onClick={() => openChat(room)}
                    className="w-full glass-panel rounded-xl p-4 border border-white/10 flex items-center gap-3 text-left hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl">
                      {room.is_group ? '👥' : room.otherParticipant?.avatar || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{room.is_group ? room.name : room.otherParticipant?.name || 'Friend'}</h3>
                      {!room.is_group && room.otherParticipant && (
                        <p className="text-xs text-muted-foreground">Lvl {room.otherParticipant.level} • {room.otherParticipant.xp} XP</p>
                      )}
                      {room.is_group && (
                        <p className="text-xs text-muted-foreground">{room.participants.length} members</p>
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
