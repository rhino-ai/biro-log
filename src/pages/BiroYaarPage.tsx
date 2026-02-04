import { Header } from '@/components/layout/Header';
import { BottomNav } from '@/components/layout/BottomNav';
import { BiroYaarChat } from '@/components/game/BiroYaarChat';

const BiroYaarPage = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="px-4 py-6 max-w-lg mx-auto">
        <div className="mb-4 text-center animate-fade-in">
          <h1 className="font-game text-xl text-primary flex items-center justify-center gap-2">
            🤖 Biro-yaar
          </h1>
          <p className="text-sm text-muted-foreground">
            Your AI Study Mentor • Ask doubts, get motivation!
          </p>
        </div>
        
        <BiroYaarChat />
      </main>

      <BottomNav />
    </div>
  );
};

export default BiroYaarPage;
