import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/store/gameStore';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Copy, Share2, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import QRCode from 'qrcode';

export const FriendInvite = () => {
  const { user } = useAuth();
  const { addXP, addCoins } = useGameStore();
  const [uniqueId, setUniqueId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [friendId, setFriendId] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('unique_id, invite_code')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setUniqueId((data as any).unique_id || '');
        setInviteCode((data as any).invite_code || '');
      }
    };
    void loadProfile();
  }, [user]);

  const inviteLink = `${window.location.origin}?invite=${inviteCode}`;

  useEffect(() => {
    if (!inviteCode) return;
    void QRCode.toDataURL(inviteLink).then(setQrDataUrl).catch(() => setQrDataUrl(''));
  }, [inviteCode, inviteLink]);

  const copyToClipboard = async (text: string, label: string) => {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied! 📋` });
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Biro-log! 🌴',
          text: `Join me on Biro-log! Invite code: ${inviteCode}`,
          url: inviteLink,
        });
      } catch {
        // user canceled
      }
    } else {
      await copyToClipboard(inviteLink, 'Invite link');
    }
  };

  const addFriendById = async () => {
    if (!friendId.trim() || !user) return;
    setIsAdding(true);

    const query = friendId.trim();
    const { data: results, error: searchError } = await supabase
      .from('profiles')
      .select('user_id, name')
      .or(`unique_id.eq.${query},invite_code.eq.${query},email.ilike.%${query}%,name.ilike.%${query}%`)
      .neq('user_id', user.id)
      .limit(1);

    if (searchError || !results || results.length === 0) {
      toast({ title: 'User not found', description: 'Check ID/code and try again', variant: 'destructive' });
      setIsAdding(false);
      return;
    }

    const friend = results[0];

    const { error } = await supabase.from('contacts').insert({
      user_id: user.id,
      contact_user_id: friend.user_id,
    });

    if (error) {
      if (error.code === '23505') toast({ title: 'Already friends! ✅' });
      else toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      addXP(50);
      addCoins(25);
      toast({ title: `Added ${friend.name}! +50 XP +25 Coins 🎉` });
    }

    setFriendId('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-xl p-4 border border-primary/20 space-y-3">
        <h3 className="font-game text-sm text-primary">Your Biro-log ID</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 font-mono text-sm">{uniqueId || 'Loading...'}</div>
          <Button variant="outline" size="icon" onClick={() => copyToClipboard(uniqueId, 'ID')}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-4 border border-accent/20 space-y-3">
        <h3 className="font-game text-sm text-accent">Invite Friends (+50 XP)</h3>
        <div className="flex gap-2">
          <Button onClick={shareInvite} className="flex-1 bg-accent gap-2">
            <Share2 className="w-4 h-4" /> Share Invite Link
          </Button>
          <Button variant="outline" onClick={() => copyToClipboard(inviteLink, 'Link')}>
            <Link2 className="w-4 h-4" />
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">QR</Button>
            </DialogTrigger>
            <DialogContent className="glass-panel border-primary/30">
              <DialogHeader><DialogTitle>Share QR Invite</DialogTitle></DialogHeader>
              <div className="flex flex-col items-center gap-3">
                {qrDataUrl ? <img src={qrDataUrl} alt="Invite QR" className="w-52 h-52 rounded-lg" /> : <p>Generating QR...</p>}
                <p className="text-xs text-muted-foreground">Scan to join via your invite link</p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="glass-panel rounded-xl p-4 border border-white/10 space-y-3">
        <h3 className="font-game text-sm">Add Friend by ID / Invite Code</h3>
        <div className="flex gap-2">
          <Input value={friendId} onChange={(e) => setFriendId(e.target.value)} placeholder="Enter ID, invite code, name, or email" className="flex-1 bg-secondary/50" />
          <Button onClick={addFriendById} disabled={!friendId.trim() || isAdding} className="bg-primary">Add</Button>
        </div>
      </div>
    </div>
  );
};
