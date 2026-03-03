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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';

interface Contact {
  id: string;
  contact_user_id: string;
  nickname: string | null;
  profile?: { name: string; avatar: string | null; email: string | null; xp?: number; level?: number };
}

interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
}

const FriendsPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [activeChat, setActiveChat] = useState<Contact | null>(null);
  const [chatMessages, setChatMessages] = useState<DirectMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupPublic, setGroupPublic] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const loadContacts = async () => {
      const { data } = await supabase.from('contacts').select('id, contact_user_id, nickname').eq('user_id', user.id);
      if (data) {
        const ids = data.map(c => c.contact_user_id);
        if (ids.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('user_id, name, avatar, email, xp, level').in('user_id', ids);
          setContacts(data.map(c => ({ ...c, profile: profiles?.find(p => p.user_id === c.contact_user_id) })));
        } else {
          setContacts(data.map(c => ({ ...c })));
        }
      }
    };
    loadContacts();
  }, [user]);

  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const { data } = await supabase.from('profiles')
      .select('user_id, name, avatar, email, xp, level')
      .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
      .neq('user_id', user?.id || '').limit(10);
    setSearchResults(data || []);
    setIsSearching(false);
  }, [user]);

  const addContact = async (contactUserId: string) => {
    if (!user) return;
    const { error } = await supabase.from('contacts').insert({ user_id: user.id, contact_user_id: contactUserId });
    if (error) {
      if (error.code === '23505') toast({ title: 'Already added!' });
      else toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Contact added! ✅' });
    setShowAddDialog(false);
    // Reload
    const { data } = await supabase.from('contacts').select('id, contact_user_id, nickname').eq('user_id', user.id);
    if (data) {
      const ids = data.map(c => c.contact_user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, name, avatar, email, xp, level').in('user_id', ids);
      setContacts(data.map(c => ({ ...c, profile: profiles?.find(p => p.user_id === c.contact_user_id) })));
    }
  };

  const openChat = async (contact: Contact) => {
    setActiveChat(contact);
    if (!user) return;
    const { data } = await supabase.from('direct_messages').select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true }).limit(100);
    setChatMessages(data || []);
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !activeChat || sendingMsg) return;
    setSendingMsg(true);
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id, receiver_id: activeChat.contact_user_id, content: messageInput.trim(),
    });
    if (!error) {
      setMessageInput('');
      const { data } = await supabase.from('direct_messages').select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat.contact_user_id}),and(sender_id.eq.${activeChat.contact_user_id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true }).limit(100);
      setChatMessages(data || []);
    }
    setSendingMsg(false);
  };

  const createGroup = async () => {
    if (!groupName.trim() || !user) return;
    const { data, error } = await supabase.from('chat_groups').insert({
      name: groupName.trim(), created_by: user.id, is_public: groupPublic,
    }).select().single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    // Add creator as member
    await supabase.from('group_members').insert({ group_id: data.id, user_id: user.id, role: 'admin' });
    toast({ title: 'Group created! 🎉' });
    setShowCreateGroup(false);
    setGroupName('');
  };

  // Realtime
  useEffect(() => {
    if (!user || !activeChat) return;
    const channel = supabase.channel('dm-' + activeChat.contact_user_id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.new as DirectMessage;
        if ((msg.sender_id === user.id && msg.receiver_id === activeChat.contact_user_id) ||
            (msg.sender_id === activeChat.contact_user_id && msg.receiver_id === user.id)) {
          setChatMessages(prev => [...prev, msg]);
        }
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
              {activeChat.profile?.avatar || '👤'}
            </div>
            <div>
              <h3 className="font-game text-sm">{activeChat.nickname || activeChat.profile?.name || 'Friend'}</h3>
              <p className="text-[10px] text-muted-foreground">
                Lvl {activeChat.profile?.level || 0} • {activeChat.profile?.xp || 0} XP
              </p>
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
                  <div className="flex items-center gap-3">
                    <Button variant={groupPublic ? 'default' : 'outline'} size="sm" onClick={() => setGroupPublic(true)} className="gap-1">
                      <Globe className="w-3 h-3" /> Public
                    </Button>
                    <Button variant={!groupPublic ? 'default' : 'outline'} size="sm" onClick={() => setGroupPublic(false)} className="gap-1">
                      <Lock className="w-3 h-3" /> Private
                    </Button>
                  </div>
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
            {contacts.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <Users className="w-16 h-16 mx-auto text-muted-foreground/30" />
                <p className="text-muted-foreground">No friends yet</p>
                <p className="text-xs text-muted-foreground">Tap + to add friends or use Invite tab to share your link!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact) => (
                  <button key={contact.id} onClick={() => openChat(contact)}
                    className="w-full glass-panel rounded-xl p-4 border border-white/10 flex items-center gap-3 text-left hover:border-primary/30 transition-colors">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-2xl">
                      {contact.profile?.avatar || '👤'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{contact.nickname || contact.profile?.name || 'Friend'}</h3>
                      <p className="text-xs text-muted-foreground">Lvl {contact.profile?.level || 0} • {contact.profile?.xp || 0} XP</p>
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
