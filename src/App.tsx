import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import PublishPage from "./pages/PublishPage";
import ChallengesPage from "./pages/ChallengesPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import CreateAvatarPage from "./pages/CreateAvatarPage";
import EditAvatarPage from "./pages/EditAvatarPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route component
function ProtectedRoute({ children, requireAvatar = true }: { children: React.ReactNode; requireAvatar?: boolean }) {
  const { user, profile, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user needs to create avatar (only for main app routes)
  if (requireAvatar && profile && !profile.avatar_snapshot_url) {
    return <Navigate to="/create-avatar" replace />;
  }
  
  return <>{children}</>;
}

// Public route - redirect to app if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/app" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes - redirect to app if already logged in */}
      <Route path="/" element={<PublicRoute><SplashPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      
      {/* Avatar Creation - protected but doesn't require avatar */}
      <Route path="/create-avatar" element={<ProtectedRoute requireAvatar={false}><CreateAvatarPage /></ProtectedRoute>} />
      <Route path="/edit-avatar" element={<ProtectedRoute requireAvatar={false}><EditAvatarPage /></ProtectedRoute>} />
      
      {/* Main App Routes - protected and requires avatar */}
      <Route path="/app" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<HomePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="publish" element={<PublishPage />} />
        <Route path="challenges" element={<ChallengesPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      
      {/* Admin Route */}
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      
      {/* Public Profile Route */}
      <Route path="/u/:userId" element={<ProtectedRoute><PublicProfilePage /></ProtectedRoute>} />
      
      {/* Catch-all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
