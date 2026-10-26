import React, { createContext, useContext, useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import axios from 'axios';
import { Download, X, Smartphone, CheckCircle, Share, PlusSquare } from 'lucide-react';
import { TonConnectUIProvider } from '@tonconnect/ui-react';

// Page Imports (Lazy loaded for code-splitting)
const Landing = React.lazy(() => import('./pages/Landing'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const Profile = React.lazy(() => import('./pages/Profile'));
const Wallet = React.lazy(() => import('./pages/Wallet'));
const AdminDashboard = React.lazy(() => import('./pages/AdminDashboard'));

// Types
export interface User {
  id: string;
  email: string;
  role: 'user' | 'admin';
  full_name: string;
  country: string;
  is_premium: boolean;
  token_balance: number;
  is_approved: boolean;
  telegram_id?: string;
  telegram_username?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// PWA Context & Hook
interface PWAContextType {
  isInstallable: boolean;
  isInstalled: boolean;
  promptInstall: () => Promise<void>;
  showInstallModal: boolean;
  setShowInstallModal: (show: boolean) => void;
  isIOS: boolean;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) throw new Error('usePWA must be used within a PWAProvider');
  return context;
};

// Theme Context & Hook
interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

// Global Zero-Blank-Page Error Boundary
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[Hooked ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-100">
          <div className="max-w-md space-y-4 rounded-3xl border border-zinc-800 bg-zinc-900/60 p-8 shadow-2xl backdrop-blur-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
              <span className="text-2xl font-black">!</span>
            </div>
            <h2 className="text-xl font-black text-white">Something went wrong</h2>
            <p className="text-xs text-zinc-400 font-light leading-relaxed">
              An unexpected interface issue was caught. Click below to reload smoothly without getting stuck.
            </p>
            <button
              onClick={this.handleReload}
              className="w-full rounded-xl bg-rose-500 py-3 text-xs font-bold text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all active:scale-95"
            >
              Reload Hooked.ink
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Set Axios defaults
axios.defaults.withCredentials = true;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  // PWA State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Theme State (Dark / Light with LocalStorage persistence)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hooked_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('hooked_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const refreshUser = async () => {
    try {
      const res = await axios.get('/api/auth/me', { timeout: 4000 });
      if (res.data?.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
    // Safety fallback timer: guarantee isLoading unlocks after 4.5s max
    const safetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 4500);
    return () => clearTimeout(safetyTimer);
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setLocation('/dashboard');
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
      setUser(null);
      setLocation('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Persistent Theme manager (system detect & storage config)
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'light' || (!savedTheme && !systemPrefersDark)) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, []);

  // PWA Service Worker Registration & Installation Prompt Handling
  useEffect(() => {
    // Check if running in standalone mode (already installed)
    const isStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    if (isStandalone) {
      setIsInstalled(true);
    }

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      setShowInstallModal(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((reg) => console.log('ServiceWorker registered:', reg.scope))
        .catch((err) => console.error('ServiceWorker registration failed:', err));
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        setShowInstallModal(false);
      }
    } else {
      // Show guided install modal
      setShowInstallModal(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 text-rose-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
          <p className="text-sm font-medium tracking-wide">Loading Hooked...</p>
        </div>
      </div>
    );
  }

  const manifestUrl = typeof window !== 'undefined' ? `${window.location.origin}/tonconnect-manifest.json` : '';

  return (
    <ErrorBoundary>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <TonConnectUIProvider manifestUrl={manifestUrl}>
          <AuthContext.Provider value={{ user, isLoading, login, logout, refreshUser }}>
      <PWAContext.Provider
        value={{
          isInstallable: isInstallable || (!isInstalled && isIOS),
          isInstalled,
          promptInstall,
          showInstallModal,
          setShowInstallModal,
          isIOS,
        }}
      >
        <React.Suspense
          fallback={
            <div className="flex h-screen items-center justify-center bg-zinc-950 text-rose-500">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
            </div>
          }
        >
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/auth" component={Auth} />
            
            {/* Protected Routes */}
            <Route path="/dashboard">
              {() => (user ? <Dashboard /> : <Auth />)}
            </Route>
            <Route path="/profile">
              {() => (user ? <Profile /> : <Auth />)}
            </Route>
            <Route path="/wallet">
              {() => (user ? <Wallet /> : <Auth />)}
            </Route>
            
            {/* Admin Protected Routes */}
            <Route path="/admin">
              {() => (user && user.role === 'admin' ? <AdminDashboard /> : <Landing />)}
            </Route>

            {/* Fallback */}
            <Route>
              {() => <Landing />}
            </Route>
          </Switch>
        </React.Suspense>

        {/* PWA Persistent Install Modal */}
        {showInstallModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
            <div className="relative w-full max-w-sm rounded-3xl border border-zinc-800 bg-zinc-950 p-6 text-center shadow-2xl animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowInstallModal(false)}
                className="absolute right-4 top-4 rounded-full bg-zinc-900 p-1.5 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-600 to-rose-400 p-3 shadow-lg shadow-rose-500/30">
                <Smartphone className="h-8 w-8 text-white" />
              </div>

              <h3 className="mt-4 text-lg font-black text-white">Install Hooked App</h3>
              <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed font-light">
                Install Hooked to your home screen for the fastest full-screen experience, instant messaging notifications, and seamless access.
              </p>

              {isIOS ? (
                <div className="mt-4 rounded-2xl bg-zinc-900/70 border border-zinc-800/80 p-3.5 text-left space-y-2 text-xs text-zinc-300">
                  <div className="flex items-center gap-2 text-rose-400 font-semibold">
                    <Share className="h-4 w-4" />
                    <span>Step 1: Tap the Share button in Safari</span>
                  </div>
                  <div className="flex items-center gap-2 text-rose-400 font-semibold">
                    <PlusSquare className="h-4 w-4" />
                    <span>Step 2: Scroll down and select "Add to Home Screen"</span>
                  </div>
                </div>
              ) : deferredPrompt ? (
                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={promptInstall}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-500 py-3 text-xs font-bold text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/25"
                  >
                    <Download className="h-4 w-4" />
                    Add to Home Screen
                  </button>
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-zinc-900/60 p-3 text-xs text-zinc-400">
                  <CheckCircle className="h-5 w-5 text-emerald-400 mx-auto mb-1.5" />
                  Your browser supports adding this app directly from the address bar or browser menu.
                </div>
              )}

              <button
                onClick={() => setShowInstallModal(false)}
                className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Continue in browser
              </button>
            </div>
          </div>
        )}
      </PWAContext.Provider>
    </AuthContext.Provider>
  </TonConnectUIProvider>
  </ThemeContext.Provider>
  </ErrorBoundary>
  );
}
