import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { JungleCard } from '@/components/game/JungleCard';

const JunglesPage = () => {
  const navigate = useNavigate();
  const { jungles, calculateJungleHealth } = useGameStore();

  // Sort jungles by health
  const sortedJungles = [...jungles].sort((a, b) => 
    calculateJungleHealth(b.id) - calculateJungleHealth(a.id)
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <div className="text-center space-y-2 animate-fade-in">
          <h1 className="font-game text-2xl text-glow-green">
            🌴 Your Jungles
          </h1>
          <p className="text-muted-foreground text-sm">
            Tap a jungle to explore chapters
          </p>
        </div>

        {/* Legend */}
        <div className="glass-panel rounded-xl p-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <h3 className="text-sm font-medium mb-3">🌳 Tree States</h3>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div className="space-y-1">
              <span className="text-2xl opacity-50">🪵</span>
              <p className="text-muted-foreground">Dry</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">🌱</span>
              <p className="text-muted-foreground">Growing</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">🌳</span>
              <p className="text-muted-foreground">Healthy</p>
            </div>
            <div className="space-y-1">
              <span className="text-2xl">🌴</span>
              <p className="text-muted-foreground">Flourish</p>
            </div>
          </div>
        </div>

        {/* Jungle Cards */}
        <div className="grid gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          {sortedJungles.map((jungle, index) => (
            <div 
              key={jungle.id} 
              className="animate-slide-up"
              style={{ animationDelay: `${0.1 * index}s` }}
            >
              <JungleCard
                jungle={jungle}
                onClick={() => navigate(`/jungle/${jungle.id}`)}
              />
            </div>
          ))}
        </div>

        {/* Info Card */}
        <div className="glass-panel rounded-2xl p-4 border border-primary/20 animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">🎯</span>
            <div>
              <h3 className="font-medium text-sm mb-1">How to Grow</h3>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>📖 Theory → Yellow leaves (+20 XP)</li>
                <li>✏️ Practice → Green leaves (+30 XP)</li>
                <li>🔁 Revision → Fruits & animals (+50 XP)</li>
              </ul>
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default JunglesPage;
