import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import TimeEntry from "@/pages/TimeEntry";
import HourBank from "@/pages/HourBank";
import Settings from "@/pages/Settings";
import Reports from "@/pages/Reports";
import NotFound from "@/pages/NotFound";
import LandingPage from "@/pages/LandingPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const AuthRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const RootRoute = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center"><p className="text-muted-foreground">Carregando...</p></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/landing" element={<LandingPage />} />
    <Route path="/login" element={<AuthRoute><Auth /></AuthRoute>} />
    <Route path="/" element={<RootRoute />} />
    <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/ponto" element={<ProtectedRoute><TimeEntry /></ProtectedRoute>} />
    <Route path="/banco" element={<ProtectedRoute><HourBank /></ProtectedRoute>} />
    <Route path="/config" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
    <Route path="/relatorios" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
