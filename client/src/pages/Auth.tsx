import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { Heart, Sparkles, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    names: '',
    phone_number: '',
    country: '',
    interaction_preference: 'just_chat',
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { login, register } = useAuth();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const loggedUser = await login(formData.email, formData.password);
        setSuccess('Successfully logged in! Redirecting...');
        setTimeout(() => {
          if (loggedUser && loggedUser.role === 'admin') {
            setLocation('/admin');
          } else {
            setLocation('/');
          }
        }, 1000);
      } else {
        const registeredUser = await register({
          email: formData.email,
          password: formData.password,
          names: formData.names,
          phone_number: formData.phone_number || undefined,
          country: formData.country || undefined,
          interaction_preference: formData.interaction_preference,
        });
        setSuccess('Registration successful! Profile sync in progress...');
        setTimeout(() => {
          if (registeredUser && registeredUser.role === 'admin') {
            setLocation('/admin');
          } else {
            setLocation('/');
          }
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070408] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden">
      {/* Decorative Glow */}
      <div className="absolute w-[300px] h-[300px] bg-pink-500/10 rounded-full blur-[100px] -top-12 -left-12 pointer-events-none" />
      <div className="absolute w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] -bottom-12 -right-12 pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-[#120b12]/60 border border-pink-500/10 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="w-6 h-6 text-pink-500 fill-pink-500 animate-pulse" />
            <span className="text-xl font-bold tracking-tight text-white">hooked</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-zinc-400 text-xs mt-1 text-center font-light">
            {isLogin ? 'Enter details to access your account' : 'Sync your profile details with our global DB'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Full Names</label>
                <input
                  type="text"
                  name="names"
                  value={formData.names}
                  onChange={handleInputChange}
                  required
                  placeholder="e.g. Alexis Jordan"
                  className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none text-sm transition-all duration-300 placeholder:text-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                  <input
                    type="tel"
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="e.g. +1 234 567 8900"
                    className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none text-sm transition-all duration-300 placeholder:text-zinc-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Country</label>
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="e.g. United States"
                    className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none text-sm transition-all duration-300 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Type of Interaction</label>
                <select
                  name="interaction_preference"
                  value={formData.interaction_preference}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none text-sm transition-all duration-300 text-white"
                >
                  <option value="just_chat">Just Chat (Online interaction only) 💬</option>
                  <option value="plan_meet">Plan Meet (With planed face to Face interaction)☕</option>
                  <option value="friendship">Friendship (No commitment) 🤝</option>
                  <option value="serious_relationship">Serious Relationship (With commitment as a partners) ❤️</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Email Address</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none text-sm transition-all duration-300 placeholder:text-zinc-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-400 uppercase tracking-widest mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                required
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-3 bg-zinc-900/60 border border-zinc-800 rounded-xl focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 outline-none text-sm transition-all duration-300 placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-2 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-semibold py-3.5 rounded-xl shadow-lg shadow-pink-500/25 hover:shadow-pink-500/40 hover:scale-[1.01] transition-all duration-300 text-sm"
          >
            {isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-zinc-500">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setSuccess(null);
            }}
            className="text-pink-500 hover:underline font-semibold"
          >
            {isLogin ? 'Create one' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
