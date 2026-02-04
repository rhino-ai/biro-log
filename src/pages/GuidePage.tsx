import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BackButton } from '@/components/layout/BackButton';
import { GuideSection } from '@/components/game/GuideSection';
import { FocusTimer } from '@/components/game/FocusTimer';

const GuidePage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Back + Page Title */}
        <div className="flex items-center justify-between animate-fade-in">
          <BackButton to="/" />
          <div className="text-center flex-1">
            <h1 className="font-game text-xl text-glow-purple flex items-center justify-center gap-2">
              📖 User Guide
            </h1>
          </div>
          <div className="w-16" />
        </div>

        {/* Focus Timer */}
        <div className="animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <FocusTimer />
        </div>

        {/* Guide Section */}
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <GuideSection />
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default GuidePage;
