import { useState, useRef } from 'react';
import { useGame } from '@/hooks/useGame';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { Avatar } from '@/components/game/Avatar';
import { XPBar } from '@/components/game/XPBar';
import { StatCard } from '@/components/game/StatCard';
import { RewardsList } from '@/components/game/RewardsList';
import { ExamDateEditor } from '@/components/game/ExamDateEditor';
import { TrackSwitcher } from '@/components/game/TrackSwitcher';
import { PWAInstallButton } from '@/components/game/PWAInstallButton';
import { AppRatingSection } from '@/components/game/AppRatingSection';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Edit2, Save, Zap, Camera, LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const avatarOptions = ['👨‍🎓', '👩‍🎓', '🧑‍💻', '👨‍🔬', '👩‍🔬', '🦸', '🦹', '🧙', '🥷', '🎮'];

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile, updateProfile, level, xp, coins, streak, calculateJungleHealth, jungles, backlogCount } = useGame();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    updateProfile(editedProfile);
    if (user) {
      try {
        await supabase.from('profiles').update({
          name: editedProfile.name,
          avatar: editedProfile.avatar,
          dream_college: editedProfile.dreamCollege,
          dream_college_image: editedProfile.dreamCollegeImage || null,
          dream_marks_cbse: editedProfile.dreamMarks.cbse,
          dream_marks_jee_main: editedProfile.dreamMarks.jeeMain,
          dream_marks_jee_advanced: editedProfile.dreamMarks.jeeAdvanced,
        }).eq('user_id', user.id);
      } catch (err) {
        console.error('Error saving profile to DB:', err);
      }
    }
    setIsEditing(false);
    toast({ title: 'Profile Updated! ✅', description: 'Your profile has been saved.' });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      setEditedProfile({ ...editedProfile, avatar: publicUrl });
      toast({ title: 'Image Uploaded! 📸' });
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  };

  const overallHealth = jungles.length > 0
    ? Math.round(jungles.reduce((acc, j) => acc + calculateJungleHealth(j.id), 0) / jungles.length)
    : 0;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="animate-fade-in"><BackButton to="/" /></div>
        <div className="glass-panel rounded-2xl p-6 text-center animate-fade-in border border-primary/20">
          <div className="flex justify-between mb-2">
            <Button size="sm" variant="ghost" onClick={handleSignOut} className="text-destructive">
              <LogOut size={14} className="mr-1" /> Logout
            </Button>
            {isEditing ? (
              <Button size="sm" onClick={handleSave} className="gap-2 bg-accent"><Save size={14} /> Save</Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="gap-2"><Edit2 size={14} /> Edit</Button>
            )}
          </div>
          <div className="relative inline-block">
            <Avatar size="lg" showMood />
            {isEditing && (
              <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-primary text-primary-foreground p-2 rounded-full" disabled={isUploading}>
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
          {isEditing ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap justify-center gap-2">
                {avatarOptions.map((emoji) => (
                  <button key={emoji} onClick={() => setEditedProfile({ ...editedProfile, avatar: emoji })}
                    className={`text-2xl p-2 rounded-full transition-all ${editedProfile.avatar === emoji ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-secondary'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
              <Input placeholder="Your name" value={editedProfile.name} onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })} className="text-center bg-secondary/50" />
              <Input placeholder="Dream College" value={editedProfile.dreamCollege} onChange={(e) => setEditedProfile({ ...editedProfile, dreamCollege: e.target.value })} className="text-center bg-secondary/50" />
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-muted-foreground">CBSE %</label><Input type="number" value={editedProfile.dreamMarks.cbse} onChange={(e) => setEditedProfile({ ...editedProfile, dreamMarks: { ...editedProfile.dreamMarks, cbse: parseInt(e.target.value) || 0 } })} className="text-center bg-secondary/50" /></div>
                <div><label className="text-xs text-muted-foreground">JEE Main</label><Input type="number" value={editedProfile.dreamMarks.jeeMain} onChange={(e) => setEditedProfile({ ...editedProfile, dreamMarks: { ...editedProfile.dreamMarks, jeeMain: parseInt(e.target.value) || 0 } })} className="text-center bg-secondary/50" /></div>
                <div><label className="text-xs text-muted-foreground">JEE Adv</label><Input type="number" value={editedProfile.dreamMarks.jeeAdvanced} onChange={(e) => setEditedProfile({ ...editedProfile, dreamMarks: { ...editedProfile.dreamMarks, jeeAdvanced: parseInt(e.target.value) || 0 } })} className="text-center bg-secondary/50" /></div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="font-game text-xl mt-4 flex items-center justify-center gap-2"><Zap className="w-5 h-5 text-accent" />{profile.name}<Zap className="w-5 h-5 text-accent" /></h2>
              <p className="text-muted-foreground text-sm">Level {level} Warrior</p>
              <p className="text-xs text-muted-foreground mt-1">{user?.email}</p>
            </>
          )}
        </div>
        <div className="glass-panel rounded-2xl p-4 animate-fade-in border border-accent/30" style={{ animationDelay: '0.1s' }}><XPBar /></div>
        <div className="grid grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <StatCard icon="⭐" value={level} label="Level" color="purple" glow />
          <StatCard icon="⚡" value={xp} label="XP" color="green" />
          <StatCard icon="🪙" value={coins} label="Coins" color="gold" />
          <StatCard icon="🔥" value={streak} label="Streak" color={streak >= 3 ? 'gold' : 'blue'} animate={streak >= 3} />
        </div>
        <div className="glass-panel rounded-2xl p-5 space-y-4 animate-fade-in border border-primary/20" style={{ animationDelay: '0.2s' }}>
          <h3 className="font-game text-lg flex items-center gap-2"><span>🎯</span> Dream Goals</h3>
          <div className="flex items-center gap-4"><span className="text-4xl">🏫</span><div><p className="text-sm text-muted-foreground">Dream College</p><p className="font-game text-primary">{profile.dreamCollege}</p></div></div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="glass-panel rounded-xl p-3 border border-primary/30"><p className="text-xs text-muted-foreground">📘 CBSE</p><p className="font-game text-accent text-lg">{profile.dreamMarks.cbse}%</p></div>
            <div className="glass-panel rounded-xl p-3 border border-accent/30"><p className="text-xs text-muted-foreground">📗 JEE Main</p><p className="font-game text-accent text-lg">{profile.dreamMarks.jeeMain}</p></div>
            <div className="glass-panel rounded-xl p-3 border border-destructive/30"><p className="text-xs text-muted-foreground">📕 JEE Adv</p><p className="font-game text-accent text-lg">{profile.dreamMarks.jeeAdvanced}</p></div>
          </div>
        </div>
        <div className="animate-fade-in" style={{ animationDelay: '0.22s' }}><TrackSwitcher /></div>
        <div className="animate-fade-in" style={{ animationDelay: '0.25s' }}><ExamDateEditor /></div>
        <div className="animate-fade-in" style={{ animationDelay: '0.27s' }}><PWAInstallButton /></div>
        <div className="glass-panel rounded-2xl p-5 space-y-4 animate-fade-in border border-accent/20" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-game text-lg flex items-center gap-2"><span>🌴</span> Jungle Status</h3>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-muted-foreground">Overall Health</p><p className="font-game text-2xl text-accent">{overallHealth}%</p></div>
            <div className="flex gap-1 text-3xl">
              {overallHealth >= 70 && <span className="animate-float">🦜</span>}
              {overallHealth >= 40 && <span className="animate-bounce-subtle">🐒</span>}
              {overallHealth < 40 && <span className="opacity-50">🍂</span>}
            </div>
          </div>
          {backlogCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-xl border border-destructive/30 animate-pulse">
              <span className="text-2xl">⚠️</span>
              <div><p className="text-sm text-destructive font-medium">RAID MODE ACTIVE!</p><p className="text-xs text-muted-foreground">{backlogCount} overdue tasks</p></div>
            </div>
          )}
        </div>
        <div className="glass-panel rounded-2xl p-5 animate-fade-in border border-accent/20" style={{ animationDelay: '0.35s' }}><RewardsList /></div>
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}><AppRatingSection /></div>
      </main>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
