import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { Copy, Share2, QrCode, Link2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export const FriendInvite = () => {
  const { user } = useAuth();
  const [uniqueId, setUniqueId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [friendId, setFriendId] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!user) return;
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (data) {
        setUniqueId((data as any).unique_id || '');
        setInviteCode((data as any).invite_code || '');
      }
    };
    loadProfile();
  }, [user]);

  const inviteLink = `${window.location.origin}?invite=${inviteCode}`;
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied! 📋` });
  };

  const shareInvite = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Biro-log! 🌴',
          text: `Hey! Join me on Biro-log for study gamification! Use my invite code: ${inviteCode}`,
          url: inviteLink,
        });
      } catch {}
    } else {
      copyToClipboard(inviteLink, 'Invite link');
    }
  };

  const addFriendById = async () => {
    if (!friendId.trim() || !user) return;
    setIsAdding(true);
    try {
      // Search by name match since unique_id/invite_code aren't in types yet
      const { data: results } = await supabase
        .from('profiles')
        .select('user_id, name')
        .or(`name.ilike.%${friendId.trim()}%,email.ilike.%${friendId.trim()}%`)
        .neq('user_id', user.id)
        .limit(1);
      const friendProfile = results?.[0] || null;
      
      if (!friendProfile) {
        toast({ title: 'User not found', description: 'Check the ID and try again', variant: 'destructive' });
        setIsAdding(false);
        return;
      }

      if (friendProfile.user_id === user.id) {
        toast({ title: "That's you! 😄", variant: 'destructive' });
        setIsAdding(false);
        return;
      }

      const { error } = await supabase.from('contacts').insert({
        user_id: user.id,
        contact_user_id: friendProfile.user_id,
      });

      if (error) {
        if (error.code === '23505') toast({ title: 'Already friends! ✅' });
        else toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: `Added ${friendProfile.name}! 🎉`, description: '+50 XP, +25 Coins for invite!' });
      }
      setFriendId('');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Your ID */}
      <div className="glass-panel rounded-xl p-4 border border-primary/20 space-y-3">
        <h3 className="font-game text-sm text-primary">Your Biro-log ID</h3>
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-secondary/50 rounded-lg px-3 py-2 font-mono text-sm">{uniqueId || 'Loading...'}</div>
          <Button variant="outline" size="icon" onClick={() => copyToClipboard(uniqueId, 'ID')}>
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Share Invite */}
      <div className="glass-panel rounded-xl p-4 border border-accent/20 space-y-3">
        <h3 className="font-game text-sm text-accent">Invite Friends (+50 XP 🎉)</h3>
        <div className="flex gap-2">
          <Button onClick={shareInvite} className="flex-1 bg-accent gap-2">
            <Share2 className="w-4 h-4" /> Share Invite Link
          </Button>
          <Button variant="outline" onClick={() => copyToClipboard(inviteLink, 'Link')}>
            <Link2 className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Share this link on WhatsApp, Telegram, Reddit etc.
        </p>
      </div>

      {/* Add by ID */}
      <div className="glass-panel rounded-xl p-4 border border-white/10 space-y-3">
        <h3 className="font-game text-sm">Add Friend by ID</h3>
        <div className="flex gap-2">
          <Input value={friendId} onChange={(e) => setFriendId(e.target.value)}
            placeholder="Enter friend's ID or invite code" className="flex-1 bg-secondary/50" />
          <Button onClick={addFriendById} disabled={!friendId.trim() || isAdding} className="bg-primary">
            Add
          </Button>
        </div>
      </div>
    </div>
  );
};
