import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../App';
import { Eye, EyeOff, Lock, Mail, User as UserIcon, Phone, Globe, AlertCircle, Camera, Loader2, Sparkles, Send } from 'lucide-react';
import axios from 'axios';

export default function Auth() {
  const { login } = useAuth();
  const [location, setLocation] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const telegramWidgetRef = useRef<HTMLDivElement>(null);
  const botUsername = (import.meta as any).env.VITE_TELEGRAM_BOT_USERNAME || 'hooked_auth_bot';

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Public Profile Onboarding (Optional during registration)
  const [gender, setGender] = useState('');
  const [height, setHeight] = useState('');
  const [bodyShape, setBodyShape] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('image', file);
    try {
      setUploading(true);
      setErrorMsg(null);
      const res = await axios.post('/api/users/upload', formData);
      if (res.data?.url) {
        setProfilePic(res.data.url);
      }
    } catch (err: any) {
      console.error('Upload failed', err);
      setErrorMsg(err.response?.data?.error || 'Failed to upload photo. Ensure JPG/PNG under 5MB.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!isLogin && !agreeTerms) {
      setErrorMsg('You must agree to the terms and conditions.');
      return;
    }

    try {
      if (isLogin) {
        const res = await axios.post('/api/auth/login', { email, password });
        if (res.data?.user) {
          login(res.data.user);
        }
      } else {
        const res = await axios.post('/api/auth/signup', {
          email,
          phone_number: phone,
          full_name: fullName,
          password,
          country,
          gender: gender || undefined,
          height: height || undefined,
          body_shape: bodyShape || undefined,
          about_me: aboutMe || undefined,
          profile_pic: profilePic || undefined,
        });
        if (res.data?.user) {
          login(res.data.user);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Authentication failed. Please try again.');
    }
  };

  const handleTelegramAuth = async (payload: { initData?: string; authData?: any }) => {
    try {
      setTelegramLoading(true);
      setErrorMsg(null);
      const res = await axios.post('/api/auth/telegram', payload);
      if (res.data?.user) {
        login(res.data.user);
      }
    } catch (err: any) {
      console.error('Telegram auth failed', err);
      setErrorMsg(err.response?.data?.error || 'Telegram authentication failed. Please try again.');
    } finally {
      setTelegramLoading(false);
    }
  };

  useEffect(() => {
    // 1. Detect if page is opened inside Telegram WebApp
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initData) {
      handleTelegramAuth({ initData: tg.initData });
    }

    // 2. Setup standard Telegram Widget callback
    (window as any).onTelegramAuth = (user: any) => {
      handleTelegramAuth({ authData: user });
    };

    // 3. Mount Telegram login script in widgetRef
    if (telegramWidgetRef.current && botUsername) {
      telegramWidgetRef.current.innerHTML = '';
      const script = document.createElement('script');
      script.src = 'https://telegram.org/js/telegram-widget.js?22';
      script.setAttribute('data-telegram-login', botUsername);
      script.setAttribute('data-size', 'large');
      script.setAttribute('data-radius', '12');
      script.setAttribute('data-request-access', 'write');
      script.setAttribute('data-userpic', 'false');
      script.setAttribute('data-onauth', 'onTelegramAuth(user)');
      script.async = true;
      telegramWidgetRef.current.appendChild(script);
    }

    return () => {
      delete (window as any).onTelegramAuth;
    };
  }, [botUsername]);

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12">
      {/* Background decoration */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[350px] h-[350px] rounded-full bg-rose-500/10 blur-[100px] -z-10"></div>

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h2 
            onClick={() => setLocation('/')} 
            className="text-3xl font-black tracking-tight text-white cursor-pointer inline-block"
          >
            HOOKED<span className="text-rose-500">.</span>ink
          </h2>
          <p className="mt-1.5 text-xs text-zinc-500 font-light">
            {isLogin ? 'Sign in to access your matches' : 'Register to find authentic partners'}
          </p>
        </div>

        <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-6 sm:p-8 shadow-2xl glass">
          {/* Tabs */}
          <div className="flex rounded-xl bg-zinc-950 p-1 mb-6">
            <button
              onClick={() => { setIsLogin(true); setErrorMsg(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${isLogin ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setErrorMsg(null); }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all duration-200 ${!isLogin ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Register
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name (Sign Up only) */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl bg-zinc-950 border border-zinc-900 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-900 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            {/* Phone & Country (Sign Up only) */}
            {!isLogin && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+123456"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Country</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      placeholder="United States"
                      className="w-full rounded-xl bg-zinc-950 border border-zinc-900 py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Password */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4.5 w-4.5 text-zinc-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-900 py-2.5 pl-10 pr-10 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                </button>
              </div>
            </div>

            {/* Optional Public Profile Setup (Sign Up only) */}
            {!isLogin && (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-rose-400" />
                    <span className="text-[11px] font-bold text-white tracking-wide">Public Showcase Profile</span>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider text-rose-400 font-semibold bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                    Visible to all
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 font-light leading-relaxed">
                  Basic details and photo visible on the public discover page and to users without subscription.
                </p>

                {/* Profile Photo Upload */}
                <div className="flex items-center gap-3">
                  <div className="relative h-14 w-14 shrink-0 rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-900 flex items-center justify-center">
                    {profilePic ? (
                      <img src={profilePic} alt="Public Preview" className="h-full w-full object-cover" />
                    ) : (
                      <Camera className="h-5 w-5 text-zinc-500" />
                    )}
                    {uploading && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-1">
                    <label className="inline-flex items-center gap-1.5 cursor-pointer rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-[11px] font-medium text-zinc-300 hover:text-white hover:border-zinc-700 transition-colors">
                      <Camera className="h-3.5 w-3.5 text-rose-400" />
                      <span>{profilePic ? 'Change Public Photo' : 'Upload Public Photo'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handlePhotoUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[9px] text-zinc-500">JPG, PNG or WEBP (Max 5MB)</p>
                  </div>
                </div>

                {/* Gender & Body Shape */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2 px-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="woman">Female</option>
                      <option value="man">Male</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">Body Shape</label>
                    <select
                      value={bodyShape}
                      onChange={(e) => setBodyShape(e.target.value)}
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2 px-2.5 text-xs text-white focus:border-rose-500 focus:outline-none"
                    >
                      <option value="">Select...</option>
                      <option value="Slim">Slim</option>
                      <option value="Athletic">Athletic</option>
                      <option value="Average">Average</option>
                      <option value="Curvy">Curvy</option>
                      <option value="Muscular">Muscular</option>
                    </select>
                  </div>
                </div>

                {/* Height & Bio */}
                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">Height</label>
                    <input
                      type="text"
                      value={height}
                      onChange={(e) => setHeight(e.target.value)}
                      placeholder="e.g. 5'7&quot; or 170cm"
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-1.5 px-3 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[9px] font-bold uppercase tracking-wider text-zinc-400">About Me / Tagline</label>
                    <textarea
                      rows={2}
                      value={aboutMe}
                      onChange={(e) => setAboutMe(e.target.value)}
                      placeholder="Share a short introduction for your public profile..."
                      className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-1.5 px-3 text-xs text-white placeholder-zinc-600 focus:border-rose-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Terms and Conditions (Sign Up only) */}
            {!isLogin && (
              <div className="flex items-start gap-2.5 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-zinc-800 bg-zinc-950 text-rose-500 focus:ring-0"
                />
                <label htmlFor="terms" className="text-[10px] text-zinc-400 leading-normal select-none">
                  I agree to the <span className="text-rose-400 cursor-pointer hover:underline">Terms & Conditions</span>. I understand that all media uploads will be vetted for authenticity before approval.
                </label>
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
                <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full rounded-xl bg-rose-500 py-3 text-xs font-semibold text-white hover:bg-rose-600 hover:scale-[1.01] active:scale-95 transition-all duration-300"
            >
              {isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Telegram Auth Integration */}
          <div className="relative my-6 flex items-center justify-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800"></div>
            </div>
            <span className="relative bg-zinc-950 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
              Or Instant Access
            </span>
          </div>

          <div className="flex flex-col items-center justify-center space-y-3">
            {telegramLoading ? (
              <div className="flex items-center gap-2 text-xs text-sky-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Verifying Telegram credentials...</span>
              </div>
            ) : (
              <>
                <div ref={telegramWidgetRef} className="flex justify-center min-h-[40px]"></div>
                <p className="text-[10px] text-zinc-500 text-center font-light">
                  Direct cryptographic sign-in anchored via Telegram Bot API
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
