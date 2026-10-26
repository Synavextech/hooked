import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth, useTheme } from '../App';
import { 
  Sparkles, ShieldCheck, Lock, CheckCircle2, 
  MessageSquare, Star, ArrowRight, ArrowDown, HelpCircle, PhoneCall,
  Sun, Moon
} from 'lucide-react';
import axios from 'axios';

interface PublicProfile {
  id: string;
  full_name: string;
  country: string;
  gender?: string;
  height?: string;
  body_shape?: string;
  skin_tone?: string;
  eye_color?: string;
  about_me?: string;
  birth_date?: string;
  show_age?: boolean;
  profile_pic?: string;
  gallery: string[];
  private_photos_count: number;
}

interface Review {
  id: string;
  full_name: string;
  rating: number;
  message: string;
}

export default function Landing() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [location, setLocation] = useLocation();
  
  // Live Members Profiles State
  const [profiles, setProfiles] = useState<PublicProfile[]>([]);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [fade, setFade] = useState(true);

  // Review states
  const [reviews, setReviews] = useState<Review[]>([]);
  const [newRating, setNewRating] = useState(5);
  const [newMessage, setNewMessage] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState(false);

  // Hero Video State & Programmatic Autoplay Streamline
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Strict browser autoplay policy: retry on first interaction
        const handleInteraction = () => {
          if (videoRef.current) {
            videoRef.current.play().catch(() => {});
          }
          window.removeEventListener('click', handleInteraction);
          window.removeEventListener('touchstart', handleInteraction);
          window.removeEventListener('scroll', handleInteraction);
        };
        window.addEventListener('click', handleInteraction, { once: true, passive: true });
        window.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
        window.addEventListener('scroll', handleInteraction, { once: true, passive: true });
      });
    }
  }, []);

  // Fetch approved reviews
  const fetchApprovedReviews = async () => {
    try {
      const res = await axios.get('/api/users/reviews');
      setReviews(res.data?.reviews || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
    }
  };

  // Fetch live public profiles (zero mock data)
  const fetchPublicProfiles = async () => {
    try {
      const res = await axios.get('/api/users/public-discover');
      if (res.data?.users && res.data.users.length > 0) {
        setProfiles(res.data.users);
      }
    } catch (err) {
      console.error('Error fetching public profiles:', err);
    }
  };

  useEffect(() => {
    fetchApprovedReviews();
    fetchPublicProfiles();
  }, []);

  // Shuffle gallery images every 3 seconds with fade
  useEffect(() => {
    if (profiles.length === 0) return;
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setGalleryIndex((prev) => (prev + 1) % profiles.length);
        setFade(true);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, [profiles.length]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (!user) {
      alert('You must be signed in to submit a review!');
      setLocation('/auth');
      return;
    }

    try {
      await axios.post('/api/users/reviews', {
        rating: newRating,
        message: newMessage,
      });

      setNewMessage('');
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
      fetchApprovedReviews();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to submit review. Please try again.');
    }
  };

  return (
    <div className="relative bg-zinc-950 text-zinc-100 min-h-screen">
      
      {/* SECTION 1: HERO */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 py-20 text-center overflow-hidden">
        {/* Floating Top Controls */}
        <div className="absolute top-6 right-6 z-30 flex items-center gap-3">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md text-zinc-400 hover:text-white hover:border-rose-500/50 hover:bg-zinc-900 transition-all active:scale-95 shadow-lg"
          >
            {theme === 'dark' ? (
              <Sun className="h-4.5 w-4.5 text-amber-400" />
            ) : (
              <Moon className="h-4.5 w-4.5 text-sky-400" />
            )}
          </button>
        </div>

        {/* Background Video with Cross-Platform Streamline */}
        <div className="absolute inset-0 -z-20 overflow-hidden pointer-events-none">
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            onLoadedData={() => setVideoLoaded(true)}
            className={`h-full w-full object-cover object-center transition-all duration-1000 ${
              videoLoaded ? 'opacity-35 scale-105' : 'opacity-10 scale-100'
            }`}
          >
            <source src="/images/hero.mp4" type="video/mp4" />
          </video>
        </div>

        {/* Gradient & Vignette Overlays for seamless blending */}
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/70 via-zinc-950/80 to-zinc-950 -z-10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-rose-950/30 via-transparent to-zinc-950/90 -z-10"></div>
        
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-rose-500/10 blur-[120px] -z-10"></div>

        <div className="max-w-3xl space-y-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-4 py-1.5 text-xs font-semibold text-rose-400 border border-rose-500/20">
            <Sparkles className="h-3.5 w-3.5" /> High Commitment Social Platform
          </span>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none text-white">
            Find Someone <br/>
            <span className="bg-gradient-to-r from-rose-400 via-rose-500 to-pink-600 bg-clip-text text-transparent">
              Authentically Beautiful
            </span>
          </h1>

          <p className="mx-auto max-w-xl text-sm sm:text-base text-zinc-400 font-light leading-relaxed">
            Welcome to Hooked.ink. A curated circle of genuine people seeking lifelong commitment. No mind games, no fake profiles—just pure authenticity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            {user ? (
              <button 
                onClick={() => setLocation('/dashboard')} 
                className="w-full sm:w-auto rounded-full bg-rose-500 px-8 py-3.5 text-sm font-semibold text-white hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center gap-2"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setLocation('/auth')} 
                  className="w-full sm:w-auto rounded-full bg-rose-500 px-8 py-3.5 text-sm font-semibold text-white hover:bg-rose-600 shadow-[0_0_20px_rgba(244,63,94,0.3)] hover:scale-105 active:scale-95 transition-all duration-300"
                >
                  Join Hooked.ink
                </button>
                <button 
                  onClick={() => setLocation('/auth')} 
                  className="w-full sm:w-auto rounded-full border border-zinc-800 bg-zinc-900/40 px-8 py-3.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 hover:text-white transition-all duration-300"
                >
                  Log In
                </button>
              </>
            )}
          </div>
        </div>

        <div className="absolute bottom-8 animate-bounce">
          <ArrowDown className="h-6 w-6 text-zinc-600" />
        </div>
      </section>

      {/* SECTION 2: ABOUT US */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-4xl grid gap-12 sm:grid-cols-2 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              An International Circle For <br/>
              <span className="text-rose-500">Authentic Commitments</span>
            </h2>
            <p className="text-zinc-400 text-sm sm:text-base leading-relaxed font-light">
              We are an American based platform, and most of our clients and partners are looking for authentically beautiful women to build a future with. We have partners from all over the world, most of them tired of games in the current dating market and are looking for a serious partner.
            </p>
            <p className="text-zinc-400 text-sm leading-relaxed font-light">
              Therefore, to ensure access to your account in our platform, ensure that you maintain a fully authentic self and do not engage in any fraudulent activities that can cause harm to any member in the platform.
            </p>
          </div>

          <div className="relative rounded-3xl overflow-hidden glass p-4 aspect-[4/3] flex items-center justify-center border border-zinc-800">
            <div className="absolute inset-0 bg-gradient-to-tr from-rose-500/10 to-transparent -z-10"></div>
            <div className="text-center space-y-3 p-6">
              <span className="text-5xl font-black text-rose-500">100%</span>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Vetted Platform Profiles</p>
              <p className="text-xs text-zinc-500">Every profile and image uploaded goes through our direct review queue to prevent frauds and bots.</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: PLATFORM FEATURES */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-5xl space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">How We Secure Connections</h2>
            <p className="mx-auto max-w-xl text-xs sm:text-sm text-zinc-400 font-light">
              Our biggest concern is to hook you up with the most authentic partner of your choice, no biases, no fakes. All the uploaded media are carefully vetted by admin for authenticity.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {/* Feature 1 */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-8 space-y-4 hover:border-rose-500/20 transition-all duration-300">
              <div className="inline-flex rounded-2xl bg-rose-500/10 p-3.5 text-rose-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Connect Confidently</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                All members of our platform have their KYC verified, so you can be sure there is a real person behind the name. Uploaded images are 80% a reflection of the real person.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-8 space-y-4 hover:border-rose-500/20 transition-all duration-300">
              <div className="inline-flex rounded-2xl bg-rose-500/10 p-3.5 text-rose-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Chat Respectfully</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                We maintain a cordial communication environment. Restricting messaging limits on pending connections guarantees respectful, intentional conversations.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-8 space-y-4 hover:border-rose-500/20 transition-all duration-300">
              <div className="inline-flex rounded-2xl bg-rose-500/10 p-3.5 text-rose-500">
                <Lock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Absolute Privacy</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                Our system is built with top anti-tracking features with a single-point access button for "Delete My Account" to erase all account records and chat history.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: LIVE SHUFFLING IMAGE GALLERY */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-md w-full space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-white">Live Members Showcase</h2>
            <p className="text-xs text-zinc-400 font-light">
              Real-time member profiles. Public traits and photos are visible to all; connection unlocks full compatibility.
            </p>
          </div>

          {profiles.length > 0 ? (
            (() => {
              const current = profiles[galleryIndex % profiles.length];
              const age = current.birth_date && current.show_age
                ? Math.abs(new Date(Date.now() - new Date(current.birth_date).getTime()).getUTCFullYear() - 1970)
                : null;

              return (
                <div className={`relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900/40 p-4 shadow-2xl transition-all duration-500 ${fade ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                  <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-zinc-950 flex items-center justify-center">
                    {current.profile_pic ? (
                      <img 
                        src={current.profile_pic} 
                        alt={current.full_name} 
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                        <div className="h-20 w-20 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 font-black text-2xl">
                          {current.full_name.charAt(0)}
                        </div>
                        <p className="text-xs text-zinc-400">Profile Verified</p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent"></div>
                    
                    <div className="absolute bottom-4 left-4 right-4 text-left space-y-1">
                      <div className="flex items-end justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-white">
                            {current.full_name}{age ? `, ${age}` : ''}
                          </h3>
                          <p className="text-xs text-rose-400 font-medium">{current.country}</p>
                        </div>
                        <span className="rounded-full bg-rose-500/20 px-3 py-1 text-[10px] font-bold text-rose-400 border border-rose-500/30">
                          Active Member
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-left space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {current.gender && (
                        <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-400">
                          {current.gender}
                        </span>
                      )}
                      {current.height && (
                        <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-400">
                          Height: {current.height}
                        </span>
                      )}
                      {current.body_shape && (
                        <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[10px] text-zinc-400">
                          Body: {current.body_shape}
                        </span>
                      )}
                      {current.private_photos_count > 0 && (
                        <span className="rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 text-[10px] text-rose-400 flex items-center gap-1">
                          <Lock className="h-2.5 w-2.5" /> {current.private_photos_count} Private Photos
                        </span>
                      )}
                    </div>
                    {current.about_me && (
                      <p className="text-xs text-zinc-400 font-light italic">
                        "{current.about_me}"
                      </p>
                    )}
                    <button
                      onClick={() => setLocation(user ? '/dashboard' : '/auth')}
                      className="w-full rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 py-2.5 text-xs font-semibold text-rose-400 hover:text-white transition-all duration-200 flex items-center justify-center gap-1.5"
                    >
                      Connect & View Profile <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-8 text-center space-y-4">
              <Sparkles className="h-8 w-8 text-rose-400 mx-auto" />
              <p className="text-xs text-zinc-400">
                New member profiles are joining every day. Register today to be showcased!
              </p>
              <button
                onClick={() => setLocation('/auth')}
                className="rounded-full bg-rose-500 px-6 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 transition-colors"
              >
                Create Account
              </button>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 5: REVIEWS & FEEDBACK */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 border-t border-zinc-900 px-4 py-20">
        <div className="mx-auto max-w-4xl w-full space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-white">Platform Testimonials</h2>
            <p className="text-xs text-zinc-400 font-light">Feedback from users who found their partners on Hooked.</p>
          </div>

          {/* Testimonial slider / list */}
          <div className="grid gap-6 sm:grid-cols-2">
            {reviews.length === 0 ? (
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-8 text-center sm:col-span-2">
                <p className="text-xs text-zinc-500">No approved reviews yet. Be the first to leave one below!</p>
              </div>
            ) : (
              reviews.slice(0, 4).map((r) => (
                <div key={r.id} className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{r.full_name}</span>
                    <div className="flex text-rose-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-rose-500' : 'text-zinc-700'}`} />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 font-light leading-relaxed">"{r.message}"</p>
                </div>
              ))
            )}
          </div>

          {/* Write a review form */}
          <div className="mx-auto max-w-md rounded-3xl border border-zinc-900 bg-zinc-900/30 p-6">
            <h3 className="text-sm font-bold text-white mb-4">Share Your Experience</h3>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">Rating</label>
                <div className="flex gap-1.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setNewRating(star)}
                      className="text-zinc-500 hover:scale-110 transition-transform"
                    >
                      <Star className={`h-6 w-6 ${star <= newRating ? 'text-rose-500 fill-rose-500' : 'text-zinc-700'}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1.5">Message</label>
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Tell us what you think..."
                  rows={3}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-800 p-3 text-xs text-white placeholder-zinc-500 focus:border-rose-500 focus:outline-none transition-colors"
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-rose-500 py-2.5 text-xs font-semibold text-white hover:bg-rose-600 transition-colors"
              >
                Submit Review
              </button>

              {reviewSuccess && (
                <p className="text-center text-[10px] text-emerald-400">Review submitted. Awaiting admin approval.</p>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* SECTION 6: FAQ */}
      <section className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 border-t border-zinc-900 px-4 py-20 pb-32">
        <div className="mx-auto max-w-2xl w-full space-y-8">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold text-white flex items-center justify-center gap-2">
              <HelpCircle className="h-7 w-7 text-rose-500" /> Frequently Asked Questions
            </h2>
            <p className="text-xs text-zinc-400 font-light">Everything you need to know about setting up and getting approved.</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-2">
              <h3 className="text-sm font-bold text-white">How does Hooked.ink work?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                Hooked.ink runs a strict authentication and vetting circle:
                <ol className="list-decimal pl-4 mt-2 space-y-1">
                  <li>Create your account and log in.</li>
                  <li>Scan through the website to find profiles you like.</li>
                  <li>Complete your onboarding profile details.</li>
                  <li><strong>Text administration on Whatsapp</strong> (button at the bottom right) to review your details.</li>
                  <li>Upgrade/pay your subscription to unlock premium search features.</li>
                  <li>Wait for admin approval of profile setup, then start sending connection requests.</li>
                </ol>
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-2">
              <h3 className="text-sm font-bold text-white">Why is my profile not showing?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                Whenever you create or update your profile details (including uploading your 6-image gallery), your profile goes into a vetting queue. The system will hold it from search results until administration verifies and approves it.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-2">
              <h3 className="text-sm font-bold text-white">What happens when I delete my account?</h3>
              <p className="text-xs text-zinc-400 leading-relaxed font-light">
                We believe in total privacy. Under your profile, clicking the "Delete My Account" button will permanently delete your registration, profile, uploaded media, connection history, chat logs, and notifications from our database.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md px-6 py-12 pb-28 sm:pb-14">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-8 text-center sm:text-left">
            {/* Brand details */}
            <div className="space-y-2">
              <h3 className="text-xl font-black tracking-tight text-white">
                HOOKED<span className="text-rose-500">.</span>ink
              </h3>
              <p className="max-w-sm text-xs text-zinc-400 font-light leading-relaxed">
                A high-commitment international circle designed for authentic lifelong partnerships. Zero bots, verified humans.
              </p>
            </div>

            {/* Social media buttons */}
            <div className="flex flex-col items-center sm:items-end gap-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
                Connect With Us
              </span>
              <div className="flex items-center gap-3">
                {/* Telegram */}
                <a
                  href="https://t.me/+h2y4tjNA1KA5YzA0"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Hooked Telegram Channel"
                  className="group flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-all duration-300 hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-400 hover:scale-110 active:scale-95 shadow-sm"
                >
                  <svg className="h-4 w-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
                  </svg>
                </a>

                {/* TikTok */}
                <a
                  href="https://www.tiktok.com/@hooked_ink?_r=1&_t=ZS-9Ar2rAx2h31"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Hooked TikTok"
                  className="group flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-all duration-300 hover:border-pink-500/50 hover:bg-pink-500/10 hover:text-pink-400 hover:scale-110 active:scale-95 shadow-sm"
                >
                  <svg className="h-4 w-4 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.85.12V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.26 6.26 0 0 0 1.87-4.49V8.59a8.28 8.28 0 0 0 4.84 1.55V6.69h-.94z" />
                  </svg>
                </a>

                {/* Instagram */}
                <a
                  href="https://www.instagram.com/hooked_ink"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Hooked Instagram"
                  className="group flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-all duration-300 hover:border-rose-500/50 hover:bg-rose-500/10 hover:text-rose-400 hover:scale-110 active:scale-95 shadow-sm"
                >
                  <svg className="h-4 w-4 fill-none stroke-current stroke-2 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                  </svg>
                </a>

                {/* X (Twitter) */}
                <a
                  href="https://x.com/hooked_ink"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Hooked on X"
                  className="group flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 transition-all duration-300 hover:border-white/50 hover:bg-white/10 hover:text-white hover:scale-110 active:scale-95 shadow-sm"
                >
                  <svg className="h-3.5 w-3.5 fill-current transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-zinc-900/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500 font-light">
            <p>© {new Date().getFullYear()} Hooked.ink. All rights reserved.</p>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="hover:text-zinc-400 transition-colors cursor-pointer">Privacy Policy</span>
              <span>•</span>
              <span className="hover:text-zinc-400 transition-colors cursor-pointer">Terms of Service</span>
              <span>•</span>
              <span className="hover:text-zinc-400 transition-colors cursor-pointer">Safety Guidelines</span>
              <span>•</span>
              <button
                onClick={toggleTheme}
                className="hover:text-rose-400 transition-colors flex items-center gap-1 font-medium"
              >
                {theme === 'dark' ? <Sun className="h-3 w-3 text-amber-400" /> : <Moon className="h-3 w-3 text-sky-400" />}
                <span>{theme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Whatsapp Float Button */}
      <a 
        href="https://wa.me/1234567890?text=Hello%20Hooked%20Admin%2C%20I%20have%20completed%20my%20profile%20on%20Hooked.ink%20and%20would%20like%20to%20request%20vetting%20approval."
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-20 right-6 sm:bottom-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-2xl hover:bg-emerald-600 hover:scale-110 active:scale-95 transition-all duration-300"
      >
        <PhoneCall className="h-6 w-6" />
      </a>
      
    </div>
  );
}
