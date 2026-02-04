import { useGameStore } from '@/store/gameStore';
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
import { Swords, Zap, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

const Index = () => {
  const navigate = useNavigate();
  const { level, xp, coins, streak, jungles, backlogCount, calculateJungleHealth, checkDeadlinesAndUpdateBacklog, getOverdueTasks } = useGameStore();
  const [showMotivation, setShowMotivation] = useState(true);

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

        {/* Biro-yaar Quick Access */}
        <Link 
          to="/biro-yaar"
          className="glass-panel rounded-2xl p-4 border border-primary/30 flex items-center justify-between cursor-pointer hover:border-primary/50 transition-colors animate-fade-in"
          style={{ animationDelay: '0.22s' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-2xl">🤖</span>
            </div>
            <div>
              <h3 className="font-game text-sm">Biro-yaar</h3>
              <p className="text-xs text-muted-foreground">AI Study Mentor • Ask doubts!</p>
            </div>
          </div>
          <MessageCircle className="w-5 h-5 text-primary" />
        </Link>

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
