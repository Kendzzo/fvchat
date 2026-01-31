import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import SplashPage from "./pages/SplashPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingSelfiePage from "./pages/OnboardingSelfiePage";
import MainLayout from "./layouts/MainLayout";
import HomePage from "./pages/HomePage";
import ChatPage from "./pages/ChatPage";
import PublishPage from "./pages/PublishPage";
import ChallengesPage from "./pages/ChallengesPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import ParentApprovePage from "./pages/ParentApprovePage";
import ParentDashboardPage from "./pages/ParentDashboardPage";
import LegalInfoPage from "./pages/LegalInfoPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Protected route component with selfie guard
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

  // SELFIE GUARD: If profile photo not completed, redirect to onboarding
  // Cast to any to access the new field that may not be in types yet
  const profileData = profile as any;
  if (profile && profileData?.profile_photo_completed === false) {
    return <Navigate to="/onboarding/selfie" replace />;
  }
  
  return <>{children}</>;
}

// Onboarding route - requires auth but NOT completed selfie
function OnboardingRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If already completed selfie, go to app
  const profileData = profile as any;
  if (profile && profileData?.profile_photo_completed === true) {
    return <Navigate to="/app" replace />;
  }
  
  return <>{children}</>;
}

// Public route - redirect to app if already logged in
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  if (user) {
    // Check if selfie completed - if not, go to onboarding
    const profileData = profile as any;
    if (profile && profileData?.profile_photo_completed === false) {
      return <Navigate to="/onboarding/selfie" replace />;
    }
    return <Navigate to="/app" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Parent Routes - PUBLIC, no auth required */}
      <Route path="/parent" element={<ParentDashboardPage />} />
      <Route path="/parent/approve" element={<ParentApprovePage />} />
      
      {/* Legal Info - PUBLIC, no auth required */}
      <Route path="/legal-info" element={<LegalInfoPage />} />
      
      {/* Auth Routes - redirect to app if already logged in */}
      <Route path="/" element={<PublicRoute><SplashPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      
      {/* Onboarding Routes - requires auth but NOT completed selfie */}
      <Route path="/onboarding/selfie" element={<OnboardingRoute><OnboardingSelfiePage /></OnboardingRoute>} />
      
      {/* Main App Routes - protected and requires completed selfie */}
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
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
