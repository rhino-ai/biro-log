import { useGameStore } from '@/store/gameStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { StatCard } from '@/components/game/StatCard';
import { XPBar } from '@/components/game/XPBar';
import { JungleCard } from '@/components/game/JungleCard';
import { ExamCountdown } from '@/components/game/ExamCountdown';
import { ActivityLog } from '@/components/game/ActivityLog';
import { QuestPanel } from '@/components/game/QuestPanel';
import { useNavigate, Link } from 'react-router-dom';
import { Swords } from 'lucide-react';
import { cn } from '@/lib/utils';

// Exam dates for 2026
const examDates = {
  cbse: new Date('2026-03-15'),
  jeeMain: new Date('2026-01-20'),
  jeeAdvanced: new Date('2026-05-25'),
};

const Index = () => {
  const navigate = useNavigate();
  const { level, xp, coins, streak, jungles, backlogCount, calculateJungleHealth } = useGameStore();

  // Calculate overall progress
  const totalHealth = jungles.reduce((acc, j) => acc + calculateJungleHealth(j.id), 0);
  const averageHealth = Math.round(totalHealth / jungles.length);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Welcome Section */}
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="font-game text-2xl text-glow-purple">
            Jungle Study 🌴
          </h1>
          <p className="text-muted-foreground text-sm">
            Study → Grow → Conquer!
          </p>
        </div>

        {/* XP Progress */}
        <div className="glass-panel rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
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

        {/* Raid Alert Banner */}
        {backlogCount > 0 && (
          <Link 
            to="/raid"
            className={cn(
              "glass-panel rounded-2xl p-4 border border-destructive/30 flex items-center justify-between",
              "animate-pulse cursor-pointer hover:border-destructive/50 transition-colors"
            )}
          >
            <div className="flex items-center gap-3">
              <div className="text-3xl animate-bounce-subtle">👹</div>
              <div>
                <h3 className="font-game text-destructive text-sm">RAID ACTIVE!</h3>
                <p className="text-xs text-muted-foreground">Defeat the Lecture Backlog boss</p>
              </div>
            </div>
            <Swords className="w-6 h-6 text-destructive" />
          </Link>
        )}

        {/* Overall Jungle Health */}
        <div className="glass-panel rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
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

        {/* Exam Countdowns */}
        <div className="space-y-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <h2 className="font-game text-lg flex items-center gap-2">
            <span>⏰</span> Exam Countdown
          </h2>
          <div className="grid gap-3">
            <ExamCountdown examName="JEE Main 2026" examDate={examDates.jeeMain} icon="📗" />
            <ExamCountdown examName="CBSE Boards" examDate={examDates.cbse} icon="📘" />
            <ExamCountdown examName="JEE Advanced" examDate={examDates.jeeAdvanced} icon="📕" />
          </div>
        </div>

        {/* Quest Panel */}
        <div className="animate-fade-in" style={{ animationDelay: '0.45s' }}>
          <QuestPanel />
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

        {/* Quick Tips */}
        <div className="glass-panel rounded-2xl p-4 border border-accent/20 animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-medium text-sm mb-1">Daily Tip</h3>
              <p className="text-xs text-muted-foreground">
                Complete theory, practice & revision for each chapter to grow your jungle! 
                Keep your streak alive for 2× XP bonus! 🔥
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
