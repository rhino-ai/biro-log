import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import JunglesPage from "./pages/JunglesPage";
import JungleDetailPage from "./pages/JungleDetailPage";
import TasksPage from "./pages/TasksPage";
import ProfilePage from "./pages/ProfilePage";
import RaidPage from "./pages/RaidPage";
import AdminPage from "./pages/AdminPage";
import AuthPage from "./pages/AuthPage";
import GuidePage from "./pages/GuidePage";
import BiroYaarPage from "./pages/BiroYaarPage";
import MentorPage from "./pages/MentorPage";
import FriendsPage from "./pages/FriendsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-muted-foreground text-sm">Loading...</p></div>
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-muted-foreground text-sm">Loading...</p></div>
    </div>
  );
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
    <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/jungles" element={<ProtectedRoute><JunglesPage /></ProtectedRoute>} />
    <Route path="/jungle/:jungleId" element={<ProtectedRoute><JungleDetailPage /></ProtectedRoute>} />
    <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
    <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
    <Route path="/raid" element={<ProtectedRoute><RaidPage /></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
    <Route path="/guide" element={<ProtectedRoute><GuidePage /></ProtectedRoute>} />
    <Route path="/biro-yaar" element={<ProtectedRoute><BiroYaarPage /></ProtectedRoute>} />
    <Route path="/mentor" element={<ProtectedRoute><MentorPage /></ProtectedRoute>} />
    <Route path="/friends" element={<ProtectedRoute><FriendsPage /></ProtectedRoute>} />
    <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const GlobalErrorHandler = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    const handleRejection = (event: PromiseRejectionEvent) => { console.error("Unhandled rejection:", event.reason); event.preventDefault(); };
    const handleError = (event: ErrorEvent) => { console.error("Unhandled error:", event.error); event.preventDefault(); };
    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);
    return () => { window.removeEventListener("unhandledrejection", handleRejection); window.removeEventListener("error", handleError); };
  }, []);
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <GlobalErrorHandler>
      <BrowserRouter>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </GlobalErrorHandler>
  </QueryClientProvider>
);

export default App;
