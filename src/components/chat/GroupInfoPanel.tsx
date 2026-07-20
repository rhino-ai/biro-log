import { useEffect, useRef, useState } from 'react';
import { supabase as _supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Camera, Crown, Loader2, MoreVertical, ShieldOff, UserMinus, UserX, RotateCcw } from 'lucide-react';

const supabase = _supabase as any;

type GroupInfo = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  avatar_url: string | null;
  invite_code: string | null;
  created_by: string;
};

type Member = {
  user_id: string;
  role: string;
  joined_at: string;
  name: string;
  avatar: string | null;
  unique_id: string | null;
};

type BannedRow = {
  user_id: string;
  reason: string | null;
  banned_at: string;
  name: string;
  avatar: string | null;
};

interface Props {
  groupId: string;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onUpdated?: (patch: { name?: string; icon?: string | null; avatar_url?: string | null }) => void;
}

export function GroupInfoPanel({ groupId, open, onOpenChange, onUpdated }: Props) {
  const { user } = useAuth();
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [banned, setBanned] = useState<BannedRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const isAdmin = !!(user && members.find(m => m.user_id === user.id && m.role === 'admin'));

  const load = async () => {
    if (!groupId || !user) return;
    setLoading(true);
    try {
      const [{ data: g }, { data: mems }] = await Promise.all([
        supabase.from('chat_groups').select('id,name,icon,description,avatar_url,invite_code,created_by').eq('id', groupId).maybeSingle(),
        supabase.from('group_members').select('user_id,role,joined_at').eq('group_id', groupId).order('joined_at', { ascending: true }),
      ]);
      setGroup(g);
      setNameDraft(g?.name || '');
      setDescDraft(g?.description || '');

      const memberIds = (mems || []).map((m: any) => m.user_id);
      const { data: profs } = memberIds.length
        ? await supabase.from('profiles').select('user_id,name,avatar,unique_id').in('user_id', memberIds)
        : { data: [] };
      const enriched: Member[] = (mems || []).map((m: any) => {
        const p = (profs || []).find((x: any) => x.user_id === m.user_id) || {};
        return { ...m, name: p.name || 'User', avatar: p.avatar || null, unique_id: p.unique_id || null };
      });
      setMembers(enriched);

      // Only admins can read bans (RLS enforces it)
      const { data: bans } = await supabase.from('group_bans').select('user_id,reason,banned_at').eq('group_id', groupId);
      const banIds = (bans || []).map((b: any) => b.user_id);
      const { data: banProfs } = banIds.length
        ? await supabase.from('profiles').select('user_id,name,avatar').in('user_id', banIds)
        : { data: [] };
      setBanned((bans || []).map((b: any) => {
        const p = (banProfs || []).find((x: any) => x.user_id === b.user_id) || {};
        return { user_id: b.user_id, reason: b.reason, banned_at: b.banned_at, name: p.name || 'User', avatar: p.avatar || null };
      }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (open) void load(); /* eslint-disable-next-line */ }, [open, groupId]);

  const saveMeta = async () => {
    if (!group) return;
    if (!nameDraft.trim()) { toast({ title: 'Name required', variant: 'destructive' }); return; }
    setSavingMeta(true);
    const { error } = await supabase.from('chat_groups')
      .update({ name: nameDraft.trim(), description: descDraft.trim() || null })
      .eq('id', group.id);
    setSavingMeta(false);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setGroup({ ...group, name: nameDraft.trim(), description: descDraft.trim() || null });
    onUpdated?.({ name: nameDraft.trim() });
    toast({ title: 'Group updated' });
  };

  const uploadPhoto = async (file: File) => {
    if (!group || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast({ title: 'Max 5MB', variant: 'destructive' }); return; }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `chat/${user.id}/group-${group.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('chat-uploads').upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage.from('chat-uploads').createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr || !signed) throw signErr || new Error('sign failed');
      const url = signed.signedUrl;
      const { error } = await supabase.from('chat_groups').update({ avatar_url: url }).eq('id', group.id);
      if (error) throw error;
      setGroup({ ...group, avatar_url: url });
      onUpdated?.({ avatar_url: url });
      toast({ title: 'Group photo updated' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const promote = async (userId: string, role: 'admin' | 'member') => {
    const { error } = await supabase.from('group_members').update({ role }).eq('group_id', groupId).eq('user_id', userId);
    if (error) { toast({ title: 'Failed', description: error.message, variant: 'destructive' }); return; }
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role } : m));
    toast({ title: role === 'admin' ? 'Promoted to admin' : 'Demoted to member' });
  };

  const kick = async (userId: string) => {
    const { error } = await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    if (error) { toast({ title: 'Kick failed', description: error.message, variant: 'destructive' }); return; }
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    toast({ title: 'Member removed' });
  };

  const ban = async (userId: string, name: string) => {
    if (!user) return;
    const reason = window.prompt(`Ban ${name}? Optional reason:`, '') ?? null;
    if (reason === null && !window.confirm(`Ban ${name} without a reason?`)) return;
    const { error: banErr } = await supabase.from('group_bans').insert({ group_id: groupId, user_id: userId, banned_by: user.id, reason });
    if (banErr) { toast({ title: 'Ban failed', description: banErr.message, variant: 'destructive' }); return; }
    await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', userId);
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    setBanned(prev => [...prev, { user_id: userId, reason, banned_at: new Date().toISOString(), name, avatar: null }]);
    toast({ title: 'User banned' });
  };

  const unban = async (userId: string) => {
    const { error } = await supabase.from('group_bans').delete().eq('group_id', groupId).eq('user_id', userId);
    if (error) { toast({ title: 'Unban failed', description: error.message, variant: 'destructive' }); return; }
    setBanned(prev => prev.filter(b => b.user_id !== userId));
    toast({ title: 'User unbanned' });
  };

  const renderAvatar = () => {
    if (group?.avatar_url) return <img src={group.avatar_url} alt={group.name} className="w-full h-full object-cover" />;
    return <span className="text-4xl">{group?.icon || '👥'}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-panel border-primary/30 max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader><DialogTitle>Group info</DialogTitle></DialogHeader>

        {loading || !group ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <ScrollArea className="flex-1 pr-2">
            <div className="space-y-5">
              <div className="flex flex-col items-center gap-3">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border border-border">
                  {renderAvatar()}
                  {isAdmin && (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? <Loader2 className="w-6 h-6 animate-spin text-white" /> : <Camera className="w-6 h-6 text-white" />}
                    </button>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadPhoto(f); e.target.value = ''; }}
                />
                <p className="text-xs text-muted-foreground">Invite code: <span className="font-mono">{group.invite_code || '—'}</span></p>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Group name</label>
                <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} disabled={!isAdmin} maxLength={64} className="bg-secondary/50" />
                <label className="text-xs text-muted-foreground">Description</label>
                <Textarea value={descDraft} onChange={(e) => setDescDraft(e.target.value)} disabled={!isAdmin} maxLength={500} rows={3} className="bg-secondary/50" placeholder={isAdmin ? 'What is this group about?' : 'No description'} />
                {isAdmin && (
                  <Button onClick={saveMeta} disabled={savingMeta || !nameDraft.trim()} className="w-full">
                    {savingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save changes'}
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-game text-sm">Members</h4>
                  <span className="text-xs text-muted-foreground">{members.length}</span>
                </div>
                <div className="space-y-1">
                  {members.map(m => {
                    const isSelf = user?.id === m.user_id;
                    const isCreator = group.created_by === m.user_id;
                    return (
                      <div key={m.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40">
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-lg shrink-0">{m.avatar || '👤'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm truncate">{m.name}{isSelf && ' (you)'}</span>
                            {m.role === 'admin' && <Badge variant="secondary" className="h-4 px-1 text-[10px]"><Crown className="w-3 h-3 mr-0.5" />Admin</Badge>}
                            {isCreator && <Badge className="h-4 px-1 text-[10px]">Creator</Badge>}
                          </div>
                          {m.unique_id && <p className="text-[10px] text-muted-foreground truncate">{m.unique_id}</p>}
                        </div>
                        {isAdmin && !isSelf && !isCreator && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="w-4 h-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-card">
                              {m.role === 'admin'
                                ? <DropdownMenuItem onClick={() => promote(m.user_id, 'member')}><ShieldOff className="w-4 h-4 mr-2" />Demote to member</DropdownMenuItem>
                                : <DropdownMenuItem onClick={() => promote(m.user_id, 'admin')}><Crown className="w-4 h-4 mr-2" />Promote to admin</DropdownMenuItem>}
                              <DropdownMenuItem onClick={() => kick(m.user_id)}><UserMinus className="w-4 h-4 mr-2" />Remove from group</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => ban(m.user_id, m.name)} className="text-destructive focus:text-destructive"><UserX className="w-4 h-4 mr-2" />Ban user</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {isAdmin && banned.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-game text-sm">Banned ({banned.length})</h4>
                  <div className="space-y-1">
                    {banned.map(b => (
                      <div key={b.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/40">
                        <div className="w-9 h-9 rounded-full bg-destructive/20 flex items-center justify-center text-lg shrink-0">{b.avatar || '🚫'}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{b.name}</p>
                          {b.reason && <p className="text-[10px] text-muted-foreground truncate">{b.reason}</p>}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => unban(b.user_id)} title="Unban"><RotateCcw className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}