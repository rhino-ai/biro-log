import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

const supabase = _supabase as any;

const JoinInvitePage = () => {
  const { code } = useParams<{ code: string }>();
  const { user, isGuest, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'idle' | 'joining' | 'done' | 'error'>('idle');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (loading) return;
    if (!code) { setStatus('error'); setError('No invite code provided.'); return; }

    if (!user || isGuest) {
      // Preserve target and send to auth
      const next = encodeURIComponent(`/join/${code}`);
      navigate(`/auth?next=${next}`, { replace: true });
      return;
    }

    const run = async () => {
      setStatus('joining');
      const trimmed = code.trim().toUpperCase();
      const { data, error: rpcErr } = await supabase.rpc('join_group_by_invite', { _code: trimmed });
      if (rpcErr) {
        setError(rpcErr.message || 'Invalid invite code.');
        setStatus('error');
        return;
      }
      toast({ title: 'Joined group', description: 'Opening chat...' });
      setStatus('done');
      // Redirect to friends page; the group will show up there
      navigate(`/friends?group=${data ?? ''}`, { replace: true });
    };
    void run();
  }, [code, user, isGuest, loading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="glass-panel rounded-2xl p-6 border border-primary/30 text-center space-y-4 max-w-sm w-full">
        <div className="w-14 h-14 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <h1 className="font-game text-lg">Group Invite</h1>
        <p className="text-xs text-muted-foreground">Code: <span className="font-mono">{code}</span></p>
        {(status === 'idle' || status === 'joining') && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Joining...
          </div>
        )}
        {status === 'error' && (
          <>
            <p className="text-sm text-destructive">{error}</p>
            <Button className="w-full" onClick={() => navigate('/friends')}>Go to Friends</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default JoinInvitePage;