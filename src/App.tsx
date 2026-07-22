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
import MindGamesPage from "./pages/MindGamesPage";
import WellnessPage from "./pages/WellnessPage";
import ScreenTimePage from "./pages/ScreenTimePage";
import AnalyticsPage from "./pages/AnalyticsPage";
import VirtualLibraryPage from "./pages/VirtualLibraryPage";
import FeedbackPage from "./pages/FeedbackPage";
import JournalPage from "./pages/JournalPage";
import TrackersPage from "./pages/TrackersPage";
import VillainModePage from "./pages/VillainModePage";
import RevisionSchedulerPage from "./pages/RevisionSchedulerPage";
import MentorTimelinePage from "./pages/MentorTimelinePage";
import JoinInvitePage from "./pages/JoinInvitePage";
import DailyHotQuestionPage from "./pages/DailyHotQuestionPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";
import { ReadModeGuard } from "@/components/system/ReadModeGuard";
import { LiveCallIndicator } from "@/components/system/LiveCallIndicator";
import { useInAppPushSound } from "@/hooks/useInAppPushSound";
import { useNavigate } from "react-router-dom";
import { initNative } from "@/lib/native";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 5 * 60 * 1000 } },
});

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-muted-foreground text-sm">Loading...</p></div>
    </div>
  );
  if (!user && !isGuest) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isGuest, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4"><Loader2 className="w-8 h-8 animate-spin text-primary" /><p className="text-muted-foreground text-sm">Loading...</p></div>
    </div>
  );
  if (user || isGuest) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  useInAppPushSound();
  const navigate = useNavigate();
  useEffect(() => {
    initNative((path) => navigate(path));
  }, [navigate]);
  return (
  <ReadModeGuard>
  <Routes>
    <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
    <Route path="/join/:code" element={<JoinInvitePage />} />
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
    <Route path="/mind-games" element={<ProtectedRoute><MindGamesPage /></ProtectedRoute>} />
    <Route path="/wellness" element={<ProtectedRoute><WellnessPage /></ProtectedRoute>} />
    <Route path="/screen-time" element={<ProtectedRoute><ScreenTimePage /></ProtectedRoute>} />
    <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
    <Route path="/virtual-library" element={<VirtualLibraryPage />} />
    <Route path="/feedback" element={<ProtectedRoute><FeedbackPage /></ProtectedRoute>} />
    <Route path="/journal" element={<ProtectedRoute><JournalPage /></ProtectedRoute>} />
    <Route path="/trackers" element={<ProtectedRoute><TrackersPage /></ProtectedRoute>} />
    <Route path="/villain" element={<ProtectedRoute><VillainModePage /></ProtectedRoute>} />
    <Route path="/revision" element={<ProtectedRoute><RevisionSchedulerPage /></ProtectedRoute>} />
    <Route path="/mentor-timeline" element={<ProtectedRoute><MentorTimelinePage /></ProtectedRoute>} />
    <Route path="/hot-question" element={<ProtectedRoute><DailyHotQuestionPage /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
  </ReadModeGuard>
  );
};

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
            <LiveCallIndicator />
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </GlobalErrorHandler>
  </QueryClientProvider>
);

export default App;
