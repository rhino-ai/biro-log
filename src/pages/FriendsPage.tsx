import { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageCircle, Plus, Search, UserPlus, Send, ArrowLeft, Video, X } from 'lucide-react';
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
  profile?: { name: string; avatar: string | null; email: string | null; phone: string | null };
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
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Load contacts
  useEffect(() => {
    if (!user) return;
    const loadContacts = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, contact_user_id, nickname')
        .eq('user_id', user.id);
      
      if (data) {
        // Load profiles for each contact
        const contactIds = data.map(c => c.contact_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name, avatar, email, phone')
          .in('user_id', contactIds);
        
        const enriched = data.map(c => ({
          ...c,
          profile: profiles?.find(p => p.user_id === c.contact_user_id),
        }));
        setContacts(enriched);
      }
    };
    loadContacts();
  }, [user]);

  // Search users
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, avatar, email, phone')
      .or(`email.ilike.%${query}%,name.ilike.%${query}%,phone.ilike.%${query}%`)
      .neq('user_id', user?.id || '')
      .limit(10);
    setSearchResults(data || []);
    setIsSearching(false);
  }, [user]);

  // Add contact
  const addContact = async (contactUserId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from('contacts')
      .insert({ user_id: user.id, contact_user_id: contactUserId });
    if (error) {
      if (error.code === '23505') toast({ title: 'Already added!' });
      else toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Contact added! ✅' });
    setShowAddDialog(false);
    // Reload contacts
    const { data } = await supabase.from('contacts').select('id, contact_user_id, nickname').eq('user_id', user.id);
    if (data) {
      const ids = data.map(c => c.contact_user_id);
      const { data: profiles } = await supabase.from('profiles').select('user_id, name, avatar, email, phone').in('user_id', ids);
      setContacts(data.map(c => ({ ...c, profile: profiles?.find(p => p.user_id === c.contact_user_id) })));
    }
  };

  // Open chat with contact
  const openChat = async (contact: Contact) => {
    setActiveChat(contact);
    if (!user) return;
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${contact.contact_user_id}),and(sender_id.eq.${contact.contact_user_id},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true })
      .limit(100);
    setChatMessages(data || []);
  };

  // Send message
  const sendMessage = async () => {
    if (!messageInput.trim() || !user || !activeChat || sendingMsg) return;
    setSendingMsg(true);
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id,
      receiver_id: activeChat.contact_user_id,
      content: messageInput.trim(),
    });
    if (error) {
      toast({ title: 'Failed to send', variant: 'destructive' });
    } else {
      setMessageInput('');
      // Reload messages
      const { data } = await supabase
        .from('direct_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${activeChat.contact_user_id}),and(sender_id.eq.${activeChat.contact_user_id},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true })
        .limit(100);
      setChatMessages(data || []);
    }
    setSendingMsg(false);
  };

  // Realtime subscription for messages
  useEffect(() => {
    if (!user || !activeChat) return;
    const channel = supabase
      .channel('dm-' + activeChat.contact_user_id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.new as DirectMessage;
        if ((msg.sender_id === user.id && msg.receiver_id === activeChat.contact_user_id) ||
            (msg.sender_id === activeChat.contact_user_id && msg.receiver_id === user.id)) {
          setChatMessages(prev => [...prev, msg]);
        }
      })
      .subscribe();
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
              <p className="text-[10px] text-muted-foreground">{activeChat.profile?.email}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => toast({ title: '📹 Video call coming soon!' })}>
            <Video className="w-5 h-5" />
          </Button>
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
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon"><UserPlus className="w-4 h-4" /></Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-primary/30">
              <DialogHeader>
                <DialogTitle>Add Friend</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input value={searchQuery} onChange={(e) => handleSearch(e.target.value)}
                    placeholder="Search by name, email, or phone..." className="pl-10" />
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
                          <p className="text-xs text-muted-foreground">{result.email}</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => addContact(result.user_id)} className="bg-accent">
                        <Plus className="w-4 h-4" />
                      </Button>
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

        {/* Contacts List */}
        {contacts.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/30" />
            <p className="text-muted-foreground">No friends yet</p>
            <p className="text-xs text-muted-foreground">Tap + to add friends by email or phone</p>
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
                  <p className="text-xs text-muted-foreground truncate">{contact.profile?.email || 'Tap to chat'}</p>
                </div>
                <MessageCircle className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default FriendsPage;
