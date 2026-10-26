import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth, usePWA, useTheme } from '../App';
import { 
  Sparkles, Wallet, User as UserIcon, ShieldAlert, LogOut, 
  Bell, Check, Trash2, Heart, Download, Smartphone, Sun, Moon
} from 'lucide-react';
import axios from 'axios';
import { io, Socket } from 'socket.io-client';

interface Notification {
  id: string;
  type: 'connection_request' | 'connection_accepted' | 'message';
  content: string;
  read: boolean;
  created_at: string;
  sender_name: string;
}

export default function Navigation() {
  const { user, logout } = useAuth();
  const { isInstalled, promptInstall } = usePWA();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const unreadCount = notifications.filter(n => !n.read).length;

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('/api/connections/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Socket.io for live notifications
    if (user) {
      socketRef.current = io(window.location.origin);
      socketRef.current.emit('join', user.id);

      socketRef.current.on('notification', () => {
        fetchNotifications();
      });

      socketRef.current.on('receive_message', () => {
        fetchNotifications();
      });
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  // Click outside handlers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await axios.post('/api/connections/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking notifications read:', err);
    }
  };

  const navItems = [
    { path: '/dashboard', icon: Sparkles, label: 'Discover' },
    { path: '/wallet', icon: Wallet, label: 'Wallet' },
    { path: '/profile', icon: UserIcon, label: 'Profile' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', icon: ShieldAlert, label: 'Admin' });
  }

  return (
    <>
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setLocation('/')}>
            <span className="text-2xl font-bold tracking-tight text-white flex items-center gap-1">
              HOOKED<span className="text-rose-500 text-3xl">.</span>ink
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Persistent Install App Button if not installed */}
            {!isInstalled && (
              <button
                onClick={promptInstall}
                title="Install Hooked to your device"
                className="flex items-center gap-1.5 rounded-full bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-400 hover:bg-rose-500 hover:text-white transition-all shadow-[0_0_12px_rgba(244,63,94,0.15)]"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Install App</span>
              </button>
            )}

            {/* Dark & Light Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white hover:border-zinc-700 transition-all active:scale-95 shadow-sm"
            >
              {theme === 'dark' ? (
                <Sun className="h-4 w-4 text-amber-400" />
              ) : (
                <Moon className="h-4 w-4 text-sky-400" />
              )}
            </button>

            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button 
                onClick={() => {
                  setShowNotifDropdown(!showNotifDropdown);
                  if (!showNotifDropdown) markAllRead();
                }}
                className="relative rounded-full p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white transition-all duration-200"
              >
                <Bell className="h-5.5 w-5.5" />
                {unreadCount > 0 && (
                  <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-zinc-950">
                    {unreadCount}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <div className="absolute right-0 mt-2 w-80 rounded-2xl glass-card p-2 shadow-2xl animate-in fade-in-50 slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
                    <h3 className="font-semibold text-white text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} className="text-xs text-rose-400 hover:underline">
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {notifications.length === 0 ? (
                      <p className="py-8 text-center text-xs text-zinc-500">No new notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`flex items-start gap-3 rounded-lg px-3 py-2 hover:bg-zinc-900/60 transition-colors ${!n.read ? 'bg-rose-500/5' : ''}`}
                        >
                          <div className="mt-1 rounded-full bg-rose-500/10 p-1.5 text-rose-500">
                            <Heart className="h-3.5 w-3.5 fill-rose-500/20" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs text-zinc-200 leading-tight">{n.content}</p>
                            <span className="text-[10px] text-zinc-500">
                              {new Date(n.created_at).toLocaleDateString(undefined, {
                                hour: '2-digit', minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Dropdown */}
            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="flex items-center gap-1 rounded-full border border-zinc-800 bg-zinc-900 p-0.5 pr-2 hover:border-rose-500/30 transition-all duration-200"
              >
                <div className="h-7 w-7 rounded-full bg-rose-500 flex items-center justify-center text-white text-xs font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="text-xs font-medium text-zinc-300 hidden sm:inline max-w-[80px] truncate">
                  {user?.full_name.split(' ')[0]}
                </span>
              </button>

              {showProfileDropdown && (
                <div className="absolute right-0 mt-2 w-52 rounded-xl glass-card p-1.5 shadow-2xl animate-in fade-in-50 slide-in-from-top-2 duration-200">
                  <div className="border-b border-zinc-800 px-3 py-2 text-xs text-zinc-400">
                    Signed in as <span className="font-semibold text-zinc-200 block truncate">{user?.email}</span>
                  </div>
                  <div className="py-1">
                    {!isInstalled && (
                      <button 
                        onClick={() => { promptInstall(); setShowProfileDropdown(false); }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
                      >
                        <Download className="h-4 w-4" />
                        Install Hooked App
                      </button>
                    )}
                    <button 
                      onClick={() => { setLocation('/profile'); setShowProfileDropdown(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    >
                      <UserIcon className="h-4 w-4" />
                      My Profile
                    </button>
                    <button 
                      onClick={() => { setLocation('/wallet'); setShowProfileDropdown(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-900 hover:text-white"
                    >
                      <Wallet className="h-4 w-4" />
                      Wallet & Premium
                    </button>
                    <button 
                      onClick={async () => { await logout(); setShowProfileDropdown(false); }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-rose-400 hover:bg-rose-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Sticky Bottom Nav Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-900 bg-zinc-950/90 pb-safe backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-md items-center justify-around px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <button
                key={item.path}
                onClick={() => setLocation(item.path)}
                className={`relative flex flex-col items-center justify-center rounded-2xl p-3 transition-all duration-300 ${
                  isActive 
                    ? 'text-rose-500 scale-110 bg-rose-500/10' 
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
              >
                <Icon className="h-6 w-6" />
                <span className="sr-only">{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-1 h-1 w-1 rounded-full bg-rose-500"></span>
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
