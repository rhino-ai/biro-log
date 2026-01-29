import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { Avatar } from '@/components/game/Avatar';
import { XPBar } from '@/components/game/XPBar';
import { StatCard } from '@/components/game/StatCard';
import { RewardsList } from '@/components/game/RewardsList';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit2, Save } from 'lucide-react';

const avatarOptions = ['👨‍🎓', '👩‍🎓', '🧑‍💻', '👨‍🔬', '👩‍🔬', '🦸', '🦹', '🧙', '🥷', '🎮'];

const ProfilePage = () => {
  const { profile, updateProfile, level, xp, coins, streak, calculateJungleHealth, jungles, backlogCount } = useGameStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState(profile);

  const handleSave = () => {
    updateProfile(editedProfile);
    setIsEditing(false);
  };

  const overallHealth = Math.round(
    jungles.reduce((acc, j) => acc + calculateJungleHealth(j.id), 0) / jungles.length
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Profile Card */}
        <div className="glass-panel rounded-2xl p-6 text-center animate-fade-in">
          <div className="flex justify-end mb-2">
            {isEditing ? (
              <Button size="sm" onClick={handleSave} className="gap-2">
                <Save size={14} /> Save
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(true)} className="gap-2">
                <Edit2 size={14} /> Edit
              </Button>
            )}
          </div>
          
          <Avatar size="lg" showMood />
          
          {isEditing ? (
            <div className="mt-4 space-y-4">
              <div className="flex flex-wrap justify-center gap-2">
                {avatarOptions.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setEditedProfile({ ...editedProfile, avatar: emoji })}
                    className={`text-2xl p-2 rounded-full transition-all ${
                      editedProfile.avatar === emoji
                        ? 'bg-primary/20 ring-2 ring-primary'
                        : 'hover:bg-secondary'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
              
              <Input
                placeholder="Your name"
                value={editedProfile.name}
                onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                className="text-center bg-secondary/50"
              />
              
              <Input
                placeholder="Dream College"
                value={editedProfile.dreamCollege}
                onChange={(e) => setEditedProfile({ ...editedProfile, dreamCollege: e.target.value })}
                className="text-center bg-secondary/50"
              />
            </div>
          ) : (
            <>
              <h2 className="font-game text-xl mt-4">{profile.name}</h2>
              <p className="text-muted-foreground text-sm">Level {level} Warrior</p>
            </>
          )}
        </div>

        {/* XP Progress */}
        <div className="glass-panel rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <XPBar />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <StatCard icon="⭐" value={level} label="Level" color="purple" glow />
          <StatCard icon="⚡" value={xp} label="XP" color="green" />
          <StatCard icon="🪙" value={coins} label="Coins" color="gold" />
          <StatCard icon="🔥" value={streak} label="Streak" color={streak >= 3 ? 'gold' : 'blue'} animate={streak >= 3} />
        </div>

        {/* Dream Goals */}
        <div className="glass-panel rounded-2xl p-5 space-y-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <h3 className="font-game text-lg flex items-center gap-2">
            <span>🎯</span> Dream Goals
          </h3>
          
          <div className="flex items-center gap-4">
            <span className="text-4xl">🏫</span>
            <div>
              <p className="text-sm text-muted-foreground">Dream College</p>
              <p className="font-game text-primary">{profile.dreamCollege}</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="glass-panel rounded-xl p-3">
              <p className="text-xs text-muted-foreground">CBSE Target</p>
              <p className="font-game text-accent text-lg">{profile.dreamMarks.cbse}%</p>
            </div>
            <div className="glass-panel rounded-xl p-3">
              <p className="text-xs text-muted-foreground">JEE Main</p>
              <p className="font-game text-accent text-lg">{profile.dreamMarks.jeeMain}</p>
            </div>
            <div className="glass-panel rounded-xl p-3">
              <p className="text-xs text-muted-foreground">JEE Adv</p>
              <p className="font-game text-accent text-lg">{profile.dreamMarks.jeeAdvanced}</p>
            </div>
          </div>
        </div>

        {/* Jungle Status */}
        <div className="glass-panel rounded-2xl p-5 space-y-4 animate-fade-in" style={{ animationDelay: '0.25s' }}>
          <h3 className="font-game text-lg flex items-center gap-2">
            <span>🌴</span> Jungle Status
          </h3>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Health</p>
              <p className="font-game text-2xl text-accent">{overallHealth}%</p>
            </div>
            <div className="flex gap-1 text-3xl">
              {overallHealth >= 70 && <span className="animate-float">🦜</span>}
              {overallHealth >= 40 && <span className="animate-bounce-subtle">🐒</span>}
              {overallHealth < 40 && <span className="opacity-50">🍂</span>}
            </div>
          </div>

          {backlogCount > 0 && (
            <div className="flex items-center gap-3 p-3 bg-raid/10 rounded-xl border border-raid/30">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-sm text-raid font-medium">Backlog Alert!</p>
                <p className="text-xs text-muted-foreground">{backlogCount} chapters need attention</p>
              </div>
            </div>
          )}
        </div>

        {/* Rewards */}
        <div className="glass-panel rounded-2xl p-5 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <RewardsList />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ProfilePage;
