import React from 'react';
import { Link, useLocation } from 'wouter';
import { Compass, User, LogOut, Sliders, Heart, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Navigation: React.FC = () => {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  const navItems = [
    { href: '/', icon: Compass, label: 'Discover' },
    { href: '/profile', icon: User, label: 'Profile' },
  ];

  if (user.role === 'admin') {
    navItems.push({ href: '/admin', icon: Sliders, label: 'Admin' });
  }

  return (
    <>
      {/* Sticky Bottom Nav for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d090d]/90 backdrop-blur-lg border-t border-pink-500/20 px-6 py-2 flex justify-around items-center">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <a className={`flex flex-col items-center justify-center p-2 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'text-pink-500 scale-110 drop-shadow-[0_0_8px_rgba(236,72,153,0.6)]' 
                  : 'text-zinc-400 hover:text-white'
              }`}>
                <Icon className="w-6 h-6" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </a>
            </Link>
          );
        })}
        <button 
          onClick={logout}
          className="flex flex-col items-center justify-center p-2 rounded-full text-zinc-400 hover:text-rose-500 transition-all duration-300"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] mt-0.5 font-medium">Exit</span>
        </button>
      </div>

      {/* Sidebar Nav for Desktop */}
      <div className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 z-50 bg-[#0d090d]/95 border-r border-pink-500/10 flex-col items-center py-8 justify-between">
        <div className="flex flex-col items-center gap-8">
          <Link href="/">
            <a className="text-pink-500 hover:scale-105 transition-all duration-300">
              <Heart className="w-8 h-8 fill-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
            </a>
          </Link>
          
          <nav className="flex flex-col gap-6 mt-12">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <a className={`relative group p-3 rounded-xl transition-all duration-300 ${
                    isActive 
                      ? 'bg-pink-500/10 text-pink-500' 
                      : 'text-zinc-400 hover:bg-zinc-800/40 hover:text-white'
                  }`}>
                    <Icon className="w-6 h-6" />
                    
                    {/* Tooltip */}
                    <span className="absolute left-24 scale-0 group-hover:scale-100 transition-all duration-200 bg-pink-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl">
                      {item.label}
                    </span>
                  </a>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-4 items-center">
          {user.is_premium ? (
            <div className="p-2 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/30" title="Premium Access">
              <Zap className="w-5 h-5 fill-pink-400" />
            </div>
          ) : null}

          <button 
            onClick={logout}
            className="p-3 rounded-xl text-zinc-400 hover:bg-rose-500/10 hover:text-rose-500 transition-all duration-300"
            title="Log Out"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
      </div>
    </>
  );
};
