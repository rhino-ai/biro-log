import { useGame } from '@/hooks/useGame';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { StatCard } from '@/components/game/StatCard';
import { XPBar } from '@/components/game/XPBar';
import { JungleCard } from '@/components/game/JungleCard';
import { ExamDateEditor } from '@/components/game/ExamDateEditor';
import { ActivityLog } from '@/components/game/ActivityLog';
import { GoalPanel } from '@/components/game/GoalPanel';
import { TestTracker } from '@/components/game/TestTracker';
import { DailyGoalWidget } from '@/components/game/DailyGoalWidget';
import { MotivationMessage } from '@/components/game/MotivationMessage';
import { CollegeImageSection } from '@/components/game/CollegeImageSection';
import { PWAInstallButton } from '@/components/game/PWAInstallButton';
import { useNavigate, Link } from 'react-router-dom';
import { Swords, Zap, Users, Trophy, Brain, Heart, Smartphone, BarChart3, Video, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { useDataSync } from '@/hooks/useDataSync';

const Index = () => {
  const navigate = useNavigate();
  const { level, xp, coins, streak, jungles, backlogCount, calculateJungleHealth, checkDeadlinesAndUpdateBacklog, getOverdueTasks } = useGame();
  const [showMotivation, setShowMotivation] = useState(true);
  
  // Sync data with database
  useDataSync();

  // Check deadlines on load
  useEffect(() => {
    checkDeadlinesAndUpdateBacklog();
  }, [checkDeadlinesAndUpdateBacklog]);

  // Calculate overall progress
  const totalHealth = jungles.reduce((acc, j) => acc + calculateJungleHealth(j.id), 0);
  const averageHealth = Math.round(totalHealth / jungles.length);
  const overdueTasks = getOverdueTasks();

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Welcome Section - Rebranded */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="font-game text-3xl text-glow-purple flex items-center justify-center gap-2">
            <Zap className="w-8 h-8 text-accent animate-pulse" />
            Biro-log
            <Zap className="w-8 h-8 text-accent animate-pulse" />
          </h1>
          <p className="text-muted-foreground text-sm italic">
            "Tanik padho, Tanik Badho 🫠"
          </p>
        </div>

        {/* Motivation Message */}
        {showMotivation && (
          <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
            <MotivationMessage onClose={() => setShowMotivation(false)} />
          </div>
        )}

        {/* Dream College Image Section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CollegeImageSection />
        </div>

        {/* XP Progress */}
        <div className="glass-panel rounded-2xl p-4 animate-fade-in border border-accent/30" style={{ animationDelay: '0.15s' }}>
          <XPBar />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <StatCard icon="⭐" value={level} label="Level" color="purple" glow />
          <StatCard icon="⚡" value={xp} label="XP" color="green" />
          <StatCard icon="🪙" value={coins} label="Coins" color="gold" />
          <StatCard 
            icon={backlogCount > 0 ? "⚠️" : "✅"} 
            value={backlogCount} 
            label="Backlog" 
            color={backlogCount > 0 ? "red" : "green"} 
          />
        </div>

        {/* Raid Alert Banner - Always visible when backlogs exist */}
        {backlogCount > 0 && (
          <Link 
            to="/raid"
            className={cn(
              "glass-panel rounded-2xl p-4 border border-raid/50 flex items-center justify-between",
              "animate-pulse cursor-pointer hover:border-raid transition-colors bg-raid/10"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-bounce-subtle">👹</div>
              <div>
                <h3 className="font-game text-raid text-sm">RAID ACTIVE!</h3>
                <p className="text-xs text-muted-foreground">
                  {overdueTasks.length} overdue tasks! Defeat the backlog boss
                </p>
              </div>
            </div>
            <Swords className="w-6 h-6 text-raid animate-pulse" />
          </Link>
        )}

        {/* Biro-yaar & Mentor Quick Access */}
        <div className="grid grid-cols-2 gap-3 animate-fade-in" style={{ animationDelay: '0.22s' }}>
          <Link to="/biro-yaar"
            className="glass-panel rounded-xl p-3 border border-primary/30 flex items-center gap-3 hover:border-primary/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-xl">🤝</span>
            </div>
            <div>
              <h3 className="font-game text-xs">Biro-yaar</h3>
              <p className="text-[10px] text-muted-foreground">AI Buddy</p>
            </div>
          </Link>
          <Link to="/mentor"
            className="glass-panel rounded-xl p-3 border border-amber-500/30 flex items-center gap-3 hover:border-amber-500/50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <span className="text-xl">🎓</span>
            </div>
            <div>
              <h3 className="font-game text-xs">Mentor</h3>
              <p className="text-[10px] text-muted-foreground">AI Guide</p>
            </div>
          </Link>
        </div>

        {/* Quick Access Grid */}
        <div className="grid grid-cols-4 gap-2 animate-fade-in" style={{ animationDelay: '0.23s' }}>
          {[
            { to: '/friends', icon: <Users className="w-4 h-4" />, label: 'Friends', color: 'from-blue-500 to-cyan-500' },
            { to: '/leaderboard', icon: <Trophy className="w-4 h-4" />, label: 'Ranks', color: 'from-coins to-orange-500' },
            { to: '/mind-games', icon: <Brain className="w-4 h-4" />, label: 'Brain Gym', color: 'from-primary to-accent' },
            { to: '/wellness', icon: <Heart className="w-4 h-4" />, label: 'Wellness', color: 'from-pink-500 to-rose-500' },
            { to: '/screen-time', icon: <Smartphone className="w-4 h-4" />, label: 'Digital', color: 'from-yellow-500 to-amber-500' },
            { to: '/analytics', icon: <BarChart3 className="w-4 h-4" />, label: 'Analytics', color: 'from-green-500 to-emerald-500' },
            { to: '/virtual-library', icon: <Video className="w-4 h-4" />, label: 'Library', color: 'from-indigo-500 to-violet-500' },
            { to: '/raid', icon: <Swords className="w-4 h-4" />, label: 'Raid', color: 'from-raid to-red-600' },
          ].map((item) => (
            <Link key={item.to} to={item.to}
              className="glass-panel rounded-xl p-2.5 border border-white/10 flex flex-col items-center gap-1.5 hover:border-primary/30 transition-colors">
              <div className={cn('w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center text-white', item.color)}>
                {item.icon}
              </div>
              <span className="text-[10px] font-game">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* PWA Install */}
        <div className="animate-fade-in" style={{ animationDelay: '0.24s' }}>
          <PWAInstallButton />
        </div>

        {/* Daily Goal Widget - Like reference image */}
        <div className="animate-fade-in" style={{ animationDelay: '0.26s' }}>
          <DailyGoalWidget />
        </div>

        {/* Overall Jungle Health */}
        <div className="glass-panel rounded-2xl p-4 animate-fade-in border border-accent/20" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">🌍</span>
              <span className="font-medium">Overall Jungle Health</span>
            </div>
            <span className="font-game text-accent text-xl">{averageHealth}%</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent/50 via-accent to-accent/80 rounded-full transition-all duration-1000"
              style={{ width: `${averageHealth}%` }}
            />
          </div>
          <div className="flex justify-center gap-2 mt-3">
            {averageHealth >= 70 && <span className="animate-float">🦜</span>}
            {averageHealth >= 50 && <span className="animate-bounce-subtle">🐒</span>}
            {averageHealth >= 30 && <span>🦋</span>}
            {averageHealth < 30 && <span className="opacity-50">🍂</span>}
          </div>
        </div>

        {/* Exam Dates - Editable */}
        <div className="animate-fade-in" style={{ animationDelay: '0.35s' }}>
          <ExamDateEditor />
        </div>

        {/* Goals Panel - Daily/Weekly/Monthly */}
        <div className="animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <GoalPanel />
        </div>

        {/* Test Tracker */}
        <div className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
          <TestTracker />
        </div>

        {/* Jungles Section */}
        <div className="space-y-4 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <h2 className="font-game text-lg flex items-center gap-2">
            <span>🌴</span> Your Jungles
          </h2>
          <div className="grid gap-4">
            {jungles.map((jungle) => (
              <JungleCard
                key={jungle.id}
                jungle={jungle}
                onClick={() => navigate(`/jungle/${jungle.id}`)}
              />
            ))}
          </div>
        </div>

        {/* Activity Log */}
        <div className="animate-fade-in" style={{ animationDelay: '0.55s' }}>
          <ActivityLog />
        </div>

        {/* Dopamine Tip */}
        <div className="glass-panel rounded-2xl p-4 border border-accent/30 animate-fade-in bg-gradient-to-r from-primary/10 to-accent/10" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl animate-pulse">⚡</span>
            <div>
              <h3 className="font-game text-sm mb-1 text-accent">DOPAMINE HIT!</h3>
              <p className="text-xs text-muted-foreground">
                Complete a task → Get XP → Level up → Unlock rewards! 
                Miss a deadline → RAID MODE → Boss Battle! 👹
              </p>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
