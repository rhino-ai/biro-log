import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Share, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check for iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // Listen for install prompt (Android/Desktop)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    
    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      toast({
        title: '🎉 App Installed!',
        description: 'Biro-log is now installed on your device.',
      });
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) {
      toast({
        title: 'Installation',
        description: 'Use your browser menu to install the app.',
      });
      return;
    }

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (isInstalled) {
    return (
      <div className="glass-panel rounded-xl p-4 border border-accent/30 flex items-center gap-3 animate-fade-in">
        <div className="p-2 bg-accent/20 rounded-full">
          <Check className="w-5 h-5 text-accent" />
        </div>
        <div>
          <p className="font-game text-sm text-accent">App Installed!</p>
          <p className="text-xs text-muted-foreground">You're using the app</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="glass-panel rounded-xl p-4 border border-primary/30 animate-fade-in">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-full animate-pulse">
              <Download className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-game text-sm">Install App</p>
              <p className="text-xs text-muted-foreground">Get offline access & notifications</p>
            </div>
          </div>
          <Button 
            onClick={handleInstall} 
            size="sm" 
            className="bg-primary glow-purple"
          >
            {isIOS ? <Share className="w-4 h-4 mr-1" /> : <Download className="w-4 h-4 mr-1" />}
            Install
          </Button>
        </div>
      </div>

      {/* iOS Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowIOSGuide(false)}>
          <div className="glass-panel rounded-2xl p-6 max-w-sm w-full border border-primary/30" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-game text-lg text-primary mb-4">📲 Install on iOS</h3>
            <ol className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs">1</span>
                <span>Tap the <Share className="w-4 h-4 inline text-accent" /> Share button at the bottom</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs">2</span>
                <span>Scroll down and tap "Add to Home Screen"</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-primary text-white px-2 py-0.5 rounded-full text-xs">3</span>
                <span>Tap "Add" to install Biro-log</span>
              </li>
            </ol>
            <Button 
              onClick={() => setShowIOSGuide(false)} 
              className="w-full mt-4 bg-accent"
            >
              Got it! 👍
            </Button>
          </div>
        </div>
      )}
    </>
  );
};
