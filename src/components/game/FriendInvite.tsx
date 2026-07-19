import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGame } from '@/hooks/useGame';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Copy, Share2, Link2, Search, Plus, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import QRCode from 'qrcode';

type SearchResult = {
  user_id: string;
  name: string;
  avatar: string | null;
  level?: number | null;
  xp?: number | null;
  unique_id?: string | null;
};

export const FriendInvite = () => {
  const { user } = useAuth();
  const { addXP, addCoins } = useGame();
  const [uniqueId, setUniqueId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [friendId, setFriendId] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('unique_id, invite_code')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) toast({ title: 'Invite profile failed', description: error.message, variant: 'destructive' });
      if (data) {
        setUniqueId((data as any).unique_id || '');
        setInviteCode((data as any).invite_code || '');
      }
    };
    void loadProfile();
  }, [user]);

  const inviteLink = `${window.location.origin}?invite=${encodeURIComponent(inviteCode)}`;

  useEffect(() => {
    if (!inviteCode) return;
    void QRCode.toDataURL(inviteLink).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [inviteCode, inviteLink]);

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const shareInvite = async () => {
    if (!inviteCode) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Join Biro-log', text: `Join me on Biro-log. My invite code: ${inviteCode}`, url: inviteLink });
      } catch {
        // user cancelled
      }
    } else {
      await copyToClipboard(inviteLink, 'Invite link');
    }
  };

  const searchUsers = useCallback(async (query: string) => {
    setFriendId(query);
    const clean = query.trim();
    if (clean.length < 2 || !user) { setResults([]); return; }
    setIsSearching(true);
    const { data, error } = await supabase.functions.invoke('social-search', { body: { query: clean } });
    if (error) {
      toast({ title: 'Search failed', description: error.message, variant: 'destructive' });
      setResults([]);
    } else {
      setResults(data?.results || []);
    }
    setIsSearching(false);
  }, [user]);

  const addFriend = async (friend: SearchResult) => {
    if (!user) return;
    setIsAdding(friend.user_id);
    const { error } = await supabase.from('contacts').upsert({ user_id: user.id, contact_user_id: friend.user_id }, { onConflict: 'user_id,contact_user_id' });

    if (error) {
      toast({ title: 'Could not add friend', description: error.message, variant: 'destructive' });
    } else {
      addXP(50);
      addCoins(25);
      toast({ title: `Added ${friend.name}`, description: '+50 XP +25 Coins' });
      setFriendId('');
      setResults([]);
    }
    setIsAdding(null);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-xl p-4 border border-primary/20 space-y-3">
        <h3 className="font-game text-sm text-primary">Your Biro-log ID</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 font-mono text-sm truncate">{uniqueId || 'Loading...'}</div>
          <Button variant="outline" size="icon" onClick={() => copyToClipboard(uniqueId, 'ID')}><Copy className="w-4 h-4" /></Button>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-4 border border-accent/20 space-y-3">
        <h3 className="font-game text-sm text-accent">Invite Friends</h3>
        <div className="flex gap-2">
          <Button onClick={shareInvite} className="flex-1 bg-accent gap-2" disabled={!inviteCode}><Share2 className="w-4 h-4" /> Share</Button>
          <Button variant="outline" onClick={() => copyToClipboard(inviteLink, 'Link')} disabled={!inviteCode}><Link2 className="w-4 h-4" /></Button>
          <Dialog>
            <DialogTrigger asChild><Button variant="outline" disabled={!inviteCode}>QR</Button></DialogTrigger>
            <DialogContent className="glass-panel border-primary/30">
              <DialogHeader><DialogTitle>Share QR Invite</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-3">
                {qrDataUrl ? <img src={qrDataUrl} alt="Invite QR" className="w-52 h-52 rounded-lg" /> : <p>Generating QR...</p>}
                <p className="text-xs text-muted-foreground">Invite code: {inviteCode}</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-4 border border-border space-y-3">
        <h3 className="font-game text-sm">Find by ID / Username / Email</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={friendId} onChange={(e) => searchUsers(e.target.value)} placeholder="BR-ID, username, invite code, or exact email" className="pl-10 bg-secondary/50" />
        </div>
        <div className="space-y-2">
          {isSearching && <p className="text-sm text-muted-foreground text-center py-3">Searching...</p>}
          {results.map((friend) => (
            <div key={friend.user_id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">{friend.avatar || '👤'}</div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{friend.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{friend.unique_id || 'Biro user'} • Lvl {friend.level || 0}</p>
                </div>
              </div>
              <Button size="icon" className="bg-primary shrink-0" onClick={() => addFriend(friend)} disabled={isAdding === friend.user_id}>
                {isAdding === friend.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          ))}
          {friendId.trim().length >= 2 && !isSearching && results.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">No user found.</p>}
        </div>
      </div>
    </div>
  );
};