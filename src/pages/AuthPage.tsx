import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Zap, Mail, Lock, User, Loader2 } from 'lucide-react';
import { TrackSelection } from '@/components/game/TrackSelection';
import { lovable } from '@/integrations/lovable/index';

const AuthPage = () => {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const { hasSelectedTrack } = useGameStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showTrackSelection, setShowTrackSelection] = useState(false);
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [signupForm, setSignupForm] = useState({ email: '', password: '', name: '' });

  useEffect(() => {
    if (user && !hasSelectedTrack) {
      setShowTrackSelection(true);
    }
  }, [user, hasSelectedTrack]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast({ title: 'Google Login Failed', description: String(result.error), variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Google login failed', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(loginForm.email, loginForm.password);
    if (error) {
      toast({ title: 'Login Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Welcome back! 🎉', description: 'Redirecting to your jungle...' });
      navigate('/');
    }
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signUp(signupForm.email, signupForm.password, signupForm.name);
    if (error) {
      toast({ title: 'Signup Failed', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Account Created! 🌱', description: 'Welcome to Biro-log!' });
      setShowTrackSelection(true);
    }
    setIsLoading(false);
  };

  const handleTrackComplete = () => {
    setShowTrackSelection(false);
    navigate('/');
  };

  if (showTrackSelection) return <TrackSelection />;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2 animate-fade-in">
          <img src="/logo.png" alt="Biro-log" className="w-20 h-20 mx-auto rounded-xl shadow-lg" />
          <h1 className="font-game text-4xl text-glow-purple flex items-center justify-center gap-2">
            <Zap className="w-10 h-10 text-accent animate-pulse" />
            Biro-log
            <Zap className="w-10 h-10 text-accent animate-pulse" />
          </h1>
          <p className="text-muted-foreground italic">"Tanik padho, Tanik Badho 🫠"</p>
        </div>

        {/* Google Sign In - Primary */}
        <div className="animate-fade-in" style={{ animationDelay: '0.05s' }}>
          <Button onClick={handleGoogleLogin} disabled={isLoading} className="w-full h-12 text-base gap-3 bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 shadow-sm">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue with Google'}
          </Button>
        </div>

        <div className="relative animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-white/10" /></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">or use email</span></div>
        </div>

        <Card className="glass-panel border-primary/30 animate-fade-in" style={{ animationDelay: '0.15s' }}>
          <CardContent className="pt-4">
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="login" className="font-game">Login</TabsTrigger>
                <TabsTrigger value="signup" className="font-game">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email" className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
                    <Input id="login-email" type="email" placeholder="your@email.com" value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })} required className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password" className="flex items-center gap-2"><Lock className="w-4 h-4" /> Password</Label>
                    <Input id="login-password" type="password" placeholder="••••••••" value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} required className="bg-secondary/50" />
                  </div>
                  <Button type="submit" className="w-full bg-primary glow-purple" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Enter Jungle 🌴
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="flex items-center gap-2"><User className="w-4 h-4" /> Name</Label>
                    <Input id="signup-name" type="text" placeholder="Your Name" value={signupForm.name}
                      onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })} className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
                    <Input id="signup-email" type="email" placeholder="your@email.com" value={signupForm.email}
                      onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })} required className="bg-secondary/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="flex items-center gap-2"><Lock className="w-4 h-4" /> Password</Label>
                    <Input id="signup-password" type="password" placeholder="••••••••" value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })} required minLength={6} className="bg-secondary/50" />
                  </div>
                  <Button type="submit" className="w-full bg-accent" disabled={isLoading}>
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Create Account 🌱
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
          By signing up, you agree to grow your jungle 🌳
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
