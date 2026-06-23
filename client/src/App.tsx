import React, { lazy, Suspense } from 'react';
import { Route, Switch, Redirect } from 'wouter';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navigation } from './components/Navigation';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WhatsAppButton } from './components/WhatsAppButton';
// Lazy loading large pages with code splitting
const Landing = lazy(() => import('./pages/Landing'));
const Auth = lazy(() => import('./pages/Auth'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Profile = lazy(() => import('./pages/Profile'));
const Admin = lazy(() => import('./pages/Admin'));

const queryClient = new QueryClient();

// Route Guard Component
const ProtectedRoute = ({ component: Component, adminOnly = false }: { component: any, adminOnly?: boolean }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070408] text-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/landing" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Redirect to="/" />;
  }

  return <Component />;
};

const MainApp: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#070408]">
      {/* Visual background accents */}
      <div className="fixed top-0 left-0 w-[40%] h-[40%] rounded-full bg-pink-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-0 right-0 w-[45%] h-[45%] rounded-full bg-purple-600/5 blur-[120px] pointer-events-none z-0" />

      {/* Navigation */}
      {user && <Navigation />}

      <div className="relative z-10">
        <Suspense fallback={
          <div className="min-h-screen bg-[#070408] text-white flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <Switch>
            <Route path="/landing" component={Landing} />
            <Route path="/auth" component={Auth} />
            
            {/* Protected Routes */}
            <Route path="/">
              {() => <ProtectedRoute component={Dashboard} />}
            </Route>
            <Route path="/profile">
              {() => <ProtectedRoute component={Profile} />}
            </Route>
            <Route path="/admin">
              {() => <ProtectedRoute component={Admin} adminOnly={true} />}
            </Route>
            
            {/* Catch-all Redirect */}
            <Route>
              <Redirect to="/" />
            </Route>
          </Switch>
        </Suspense>
      </div>
      
      {/* Global Hanging WhatsApp Button */}
      <WhatsAppButton />
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
