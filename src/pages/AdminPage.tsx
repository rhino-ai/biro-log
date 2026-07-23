import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Loader2, Shield, Users, Trophy, Trash2, Save, MessageSquare, Flame, CalendarDays } from 'lucide-react';

type AdminUser = {
  user_id: string;
  name: string | null;
  email: string | null;
  level: number | null;
  xp: number | null;
  coins: number | null;
  streak: number | null;
  unique_id: string | null;
};

type RuleRow = {
  id: number;
  xp_per_level: number;
  focus_xp_seconds: number;
  focus_coin_seconds: number;
  invite_xp: number;
  invite_coins: number;
};

type FeedbackRow = {
  id: string;
  rating: number;
  suggestion: string | null;
  feature_request: string | null;
  created_at: string;
  user_id: string;
};

type HotQuestionRow = {
  id: string;
  title: string;
  content: string;
  image_url: string | null;
  kind: 'text' | 'poll' | 'image' | 'quiz';
  schedule_basis: 'daily' | 'weekly' | 'monthly' | 'yearly';
  starts_at: string;
  ends_at: string | null;
  poll_options: string[];
  quiz_options: string[];
  correct_answer: string | null;
  is_active: boolean;
};

const AdminPage = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const [stepOne, setStepOne] = useState('');
  const [stepTwo, setStepTwo] = useState('');
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sortBy, setSortBy] = useState<'xp' | 'coins' | 'level'>('xp');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [editStats, setEditStats] = useState({ xp: 0, level: 0, coins: 0 });
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const [rules, setRules] = useState<RuleRow>({
    id: 1,
    xp_per_level: 100,
    focus_xp_seconds: 15,
    focus_coin_seconds: 30,
    invite_xp: 50,
    invite_coins: 25,
  });
  const [savingRules, setSavingRules] = useState(false);

  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [hotQuestions, setHotQuestions] = useState<HotQuestionRow[]>([]);
  const [hotForm, setHotForm] = useState({
    title: '',
    content: '',
    image_url: '',
    kind: 'text' as HotQuestionRow['kind'],
    schedule_basis: 'daily' as HotQuestionRow['schedule_basis'],
    starts_at: new Date().toISOString().slice(0, 16),
    ends_at: '',
    options: '',
    correct_answer: '',
  });
  const [savingHot, setSavingHot] = useState(false);

  const loadAdminData = async () => {
    const [usersRes, rulesRes, feedbackRes, hotRes] = await Promise.all([
      supabase
        .from('profiles')
        .select('user_id,name,level,xp,coins,streak,unique_id')
        .order(sortBy, { ascending: false })
        .limit(200),
      supabase
        .from('gamification_rules')
        .select('id,xp_per_level,focus_xp_seconds,focus_coin_seconds,invite_xp,invite_coins')
        .eq('id', 1)
        .single(),
      supabase
        .from('app_feedback')
        .select('id,rating,suggestion,feature_request,created_at,user_id')
        .order('created_at', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('daily_hot_questions')
        .select('id,title,content,image_url,kind,schedule_basis,starts_at,ends_at,poll_options,quiz_options,correct_answer,is_active')
        .order('starts_at', { ascending: false })
        .limit(30),
    ]);

    if (usersRes.data) {
      setUsers(usersRes.data as AdminUser[]);
      if (!selectedUserId && usersRes.data.length > 0) {
        const first = usersRes.data[0] as AdminUser;
        setSelectedUserId(first.user_id);
        setEditStats({
          xp: first.xp || 0,
          level: first.level || 0,
          coins: first.coins || 0,
        });
      }
    }

    if (rulesRes.data) setRules(rulesRes.data as RuleRow);
    if (feedbackRes.data) setFeedback(feedbackRes.data as FeedbackRow[]);
    if ((hotRes as any).data) setHotQuestions((hotRes as any).data as HotQuestionRow[]);
  };

  useEffect(() => {
    if (isAdmin && isUnlocked) {
      void loadAdminData();
    }
  }, [isAdmin, isUnlocked, sortBy]);

  const selectedUser = useMemo(
    () => users.find((u) => u.user_id === selectedUserId),
    [users, selectedUserId],
  );

  const unlockAdmin = async () => {
    setIsUnlocking(true);
    const { data, error } = await supabase.functions.invoke('verify-admin-codes', {
      body: { stepOne, stepTwo },
    });

    if (error || !data?.ok) {
      toast({ title: 'Invalid 2-step password', variant: 'destructive' });
    } else {
      setIsUnlocked(true);
      toast({ title: 'Admin unlocked ✅' });
    }
    setIsUnlocking(false);
  };

  const saveUserStats = async () => {
    if (!selectedUserId) return;
    setBusyUserId(selectedUserId);

    const { error } = await supabase
      .from('profiles')
      .update({ xp: editStats.xp, level: editStats.level, coins: editStats.coins })
      .eq('user_id', selectedUserId);

    if (error) {
      toast({ title: 'Failed to save user stats', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'User stats updated' });
      void loadAdminData();
    }

    setBusyUserId(null);
  };

  const deleteUserData = async (targetUserId: string) => {
    setBusyUserId(targetUserId);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-user-controls`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: 'delete_user', targetUserId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      toast({ title: 'Delete failed', description: errorText, variant: 'destructive' });
    } else {
      toast({ title: 'User removed successfully' });
      if (selectedUserId === targetUserId) setSelectedUserId('');
      void loadAdminData();
    }

    setBusyUserId(null);
  };

  const saveRules = async () => {
    setSavingRules(true);
    const { error } = await supabase
      .from('gamification_rules')
      .update({
        xp_per_level: rules.xp_per_level,
        focus_xp_seconds: rules.focus_xp_seconds,
        focus_coin_seconds: rules.focus_coin_seconds,
        invite_xp: rules.invite_xp,
        invite_coins: rules.invite_coins,
      })
      .eq('id', 1);

    if (error) {
      toast({ title: 'Failed to save rules', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Rules updated ✅' });
    }

    setSavingRules(false);
  };

  const saveHotQuestion = async () => {
    if (!user || !hotForm.title.trim()) return;
    setSavingHot(true);
    const options = hotForm.options.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 8);
    const startsAt = new Date(hotForm.starts_at).toISOString();
    const endsAt = hotForm.ends_at ? new Date(hotForm.ends_at).toISOString() : null;
    const { error } = await (supabase as any).from('daily_hot_questions').insert({
      owner_id: user.id,
      admin_id: user.id,
      title: hotForm.title.trim(),
      content: hotForm.content.trim(),
      image_url: hotForm.image_url.trim() || null,
      kind: hotForm.kind,
      schedule_basis: hotForm.schedule_basis,
      starts_at: startsAt,
      ends_at: endsAt,
      poll_options: hotForm.kind === 'poll' ? options : [],
      quiz_options: hotForm.kind === 'quiz' ? options : [],
      correct_answer: hotForm.kind === 'quiz' ? hotForm.correct_answer.trim() || options[0] || null : null,
      is_active: true,
    });
    if (error) toast({ title: 'Hot question save failed', description: error.message, variant: 'destructive' });
    else {
      toast({ title: 'Hot question scheduled 🔥' });
      setHotForm((p) => ({ ...p, title: '', content: '', image_url: '', options: '', correct_answer: '' }));
      void loadAdminData();
    }
    setSavingHot(false);
  };

  const toggleHotQuestion = async (id: string, isActive: boolean) => {
    const { error } = await (supabase as any).from('daily_hot_questions').update({ is_active: !isActive }).eq('id', id);
    if (error) toast({ title: 'Update failed', description: error.message, variant: 'destructive' });
    else void loadAdminData();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <main className="px-4 py-6 max-w-lg mx-auto">
          <Card className="glass-panel border-primary/30">
            <CardHeader>
              <CardTitle className="font-game text-primary">Admin 2-Step Unlock</CardTitle>
              <CardDescription>Enter step passwords to open admin controls</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Step 1 password</Label>
                <Input value={stepOne} onChange={(e) => setStepOne(e.target.value)} type="password" />
              </div>
              <div>
                <Label>Step 2 password</Label>
                <Input value={stepTwo} onChange={(e) => setStepTwo(e.target.value)} type="password" />
              </div>
              <Button className="w-full" onClick={unlockAdmin} disabled={isUnlocking || !stepOne || !stepTwo}>
                {isUnlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}
                Unlock Admin
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <main className="px-4 py-6 max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="font-game text-2xl text-primary">Admin Control Center</h1>
          <p className="text-sm text-muted-foreground">Manage users, rules, and feedback</p>
        </div>

        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="rules">XP Rules</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="hot">Hot Qs</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="w-4 h-4" /> User Ranking</CardTitle>
                <div className="w-44">
                  <Select value={sortBy} onValueChange={(v) => setSortBy(v as 'xp' | 'coins' | 'level')}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xp">Sort by XP</SelectItem>
                      <SelectItem value="coins">Sort by Coins</SelectItem>
                      <SelectItem value="level">Sort by Level</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 max-h-72 overflow-auto">
                {users.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => {
                      setSelectedUserId(u.user_id);
                      setEditStats({ xp: u.xp || 0, level: u.level || 0, coins: u.coins || 0 });
                    }}
                    className={`w-full rounded-lg p-3 border text-left ${selectedUserId === u.user_id ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{u.name || 'Student'} ({u.unique_id || 'N/A'})</p>
                        <p className="text-xs text-muted-foreground">Streak {u.streak || 0}</p>
                      </div>
                      <p className="text-xs">Lv.{u.level || 0} • ⚡{u.xp || 0} • 🪙{u.coins || 0}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>

            {selectedUser && (
              <Card className="glass-panel border-primary/20">
                <CardHeader>
                  <CardTitle className="text-sm">Edit {selectedUser.name || 'User'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div><Label>XP</Label><Input type="number" value={editStats.xp} onChange={(e) => setEditStats((p) => ({ ...p, xp: Number(e.target.value) || 0 }))} /></div>
                    <div><Label>Level</Label><Input type="number" value={editStats.level} onChange={(e) => setEditStats((p) => ({ ...p, level: Number(e.target.value) || 0 }))} /></div>
                    <div><Label>Coins</Label><Input type="number" value={editStats.coins} onChange={(e) => setEditStats((p) => ({ ...p, coins: Number(e.target.value) || 0 }))} /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={saveUserStats} disabled={busyUserId === selectedUser.user_id}>
                      <Save className="w-4 h-4 mr-2" /> Save Stats
                    </Button>
                    <Button variant="destructive" onClick={() => deleteUserData(selectedUser.user_id)} disabled={busyUserId === selectedUser.user_id}>
                      <Trash2 className="w-4 h-4 mr-2" /> Remove User
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="rules" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Trophy className="w-4 h-4" /> XP / Coin Rules</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <div><Label>XP per level</Label><Input type="number" value={rules.xp_per_level} onChange={(e) => setRules((p) => ({ ...p, xp_per_level: Number(e.target.value) || 100 }))} /></div>
                <div><Label>Focus XP seconds</Label><Input type="number" value={rules.focus_xp_seconds} onChange={(e) => setRules((p) => ({ ...p, focus_xp_seconds: Number(e.target.value) || 15 }))} /></div>
                <div><Label>Focus coin seconds</Label><Input type="number" value={rules.focus_coin_seconds} onChange={(e) => setRules((p) => ({ ...p, focus_coin_seconds: Number(e.target.value) || 30 }))} /></div>
                <div><Label>Invite XP</Label><Input type="number" value={rules.invite_xp} onChange={(e) => setRules((p) => ({ ...p, invite_xp: Number(e.target.value) || 50 }))} /></div>
                <div><Label>Invite coins</Label><Input type="number" value={rules.invite_coins} onChange={(e) => setRules((p) => ({ ...p, invite_coins: Number(e.target.value) || 25 }))} /></div>
              </CardContent>
              <CardContent>
                <Button onClick={saveRules} disabled={savingRules}>{savingRules ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Rules'}</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="feedback" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="w-4 h-4" /> User Ratings & Suggestions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 max-h-80 overflow-auto">
                {feedback.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
                {feedback.map((item) => (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <p className="text-sm">⭐ {item.rating}/5</p>
                    {item.suggestion && <p className="text-xs text-muted-foreground mt-1">{item.suggestion}</p>}
                    {item.feature_request && <p className="text-xs mt-1">Feature: {item.feature_request}</p>}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="hot" className="space-y-4">
            <Card className="glass-panel border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Flame className="w-4 h-4" /> Daily / Weekly Hot Question Owner Panel</CardTitle>
                <CardDescription>Schedule text, image, poll, and quiz prompts for students.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label>Title</Label><Input value={hotForm.title} onChange={(e) => setHotForm((p) => ({ ...p, title: e.target.value }))} /></div>
                  <div><Label>Image URL / attachment URL</Label><Input value={hotForm.image_url} onChange={(e) => setHotForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="Optional" /></div>
                </div>
                <div><Label>Question / prompt</Label><Textarea value={hotForm.content} onChange={(e) => setHotForm((p) => ({ ...p, content: e.target.value }))} rows={4} /></div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div><Label>Type</Label><Select value={hotForm.kind} onValueChange={(v) => setHotForm((p) => ({ ...p, kind: v as HotQuestionRow['kind'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="text">Text</SelectItem><SelectItem value="image">Image</SelectItem><SelectItem value="poll">Poll</SelectItem><SelectItem value="quiz">Quiz</SelectItem></SelectContent></Select></div>
                  <div><Label>Basis</Label><Select value={hotForm.schedule_basis} onValueChange={(v) => setHotForm((p) => ({ ...p, schedule_basis: v as HotQuestionRow['schedule_basis'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem><SelectItem value="yearly">Yearly</SelectItem></SelectContent></Select></div>
                  <div><Label>Start</Label><Input type="datetime-local" value={hotForm.starts_at} onChange={(e) => setHotForm((p) => ({ ...p, starts_at: e.target.value }))} /></div>
                  <div><Label>End</Label><Input type="datetime-local" value={hotForm.ends_at} onChange={(e) => setHotForm((p) => ({ ...p, ends_at: e.target.value }))} /></div>
                </div>
                {(hotForm.kind === 'poll' || hotForm.kind === 'quiz') && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div><Label>Options (one per line)</Label><Textarea value={hotForm.options} onChange={(e) => setHotForm((p) => ({ ...p, options: e.target.value }))} rows={4} /></div>
                    {hotForm.kind === 'quiz' && <div><Label>Correct answer</Label><Input value={hotForm.correct_answer} onChange={(e) => setHotForm((p) => ({ ...p, correct_answer: e.target.value }))} placeholder="Must match one option" /></div>}
                  </div>
                )}
                <Button onClick={saveHotQuestion} disabled={savingHot || !hotForm.title.trim()}>{savingHot ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Save Hot Question</Button>
              </CardContent>
            </Card>

            <Card className="glass-panel border-primary/20">
              <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Scheduled Hot Questions</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-80 overflow-auto">
                {hotQuestions.length === 0 && <p className="text-sm text-muted-foreground">No hot questions scheduled.</p>}
                {hotQuestions.map((q) => (
                  <div key={q.id} className="rounded-lg border border-border p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{q.title}</p>
                      <p className="text-xs text-muted-foreground">{q.kind} • {q.schedule_basis} • {new Date(q.starts_at).toLocaleString()}</p>
                      <p className="text-xs mt-1 line-clamp-2">{q.content}</p>
                    </div>
                    <Button size="sm" variant={q.is_active ? 'destructive' : 'outline'} onClick={() => toggleHotQuestion(q.id, q.is_active)}>{q.is_active ? 'Pause' : 'Activate'}</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminPage;
