import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Heart, Shield, Sparkles, Zap, MessageSquare, Star, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';

const galleryImages = [
  '/images/h1.jpg', '/images/h2.jpg', '/images/h3.jpeg', '/images/h4.jpeg',
  '/images/h5.jpg', '/images/h6.jpg', '/images/h7.jpeg', '/images/h8.jpeg',
  '/images/h9.jpeg', '/images/h10.jpg', '/images/h11.webp', '/images/h12.jpg',
  '/images/h13.webp', '/images/h14.jpg', '/images/h15.jpeg', '/images/h16.jpeg',
  '/images/h17.jpg', '/images/h18.avif', '/images/h19.avif', '/images/h20.jpeg'
].sort(() => Math.random() - 0.5);

const Landing: React.FC = () => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [isHowItWorksOpen, setIsHowItWorksOpen] = useState(false);
  const [images, setImages] = useState<string[]>(galleryImages);

  const fetchActiveReviews = async () => {
    try {
      const res = await api.get('/reviews/active');
      setReviews(res.data);
    } catch (err) {
      console.error('Failed to fetch reviews', err);
    }
  };

  useEffect(() => {
    fetchActiveReviews();
  }, []);

  useEffect(() => {
    const shuffleTimer = setInterval(() => {
      setImages(prev => {
        const shuffled = [...prev];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
      });
    }, 2000);
    return () => clearInterval(shuffleTimer);
  }, []);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      await api.post('/reviews', { rating, message });
      setSubmitSuccess('Review submitted! It will appear on the landing page once approved by an admin.');
      setMessage('');
      setRating(5);
      fetchActiveReviews();
    } catch (err: any) {
      setSubmitError(err.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070408] text-white flex flex-col justify-between overflow-hidden relative">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="container mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <Heart className="w-8 h-8 text-pink-500 fill-pink-500 animate-pulse drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
          <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-pink-100 to-pink-500 bg-clip-text text-transparent">
            Hooked
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsHowItWorksOpen(true)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 hover:border-pink-500/40 text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-300 backdrop-blur-md cursor-pointer text-zinc-300 hover:text-white"
          >
            How It Works
          </button>
          <Link href="/auth">
            <a className="bg-white/10 hover:bg-white/20 border border-white/20 hover:border-pink-500/40 text-sm font-semibold px-6 py-2.5 rounded-full transition-all duration-300 backdrop-blur-md">
              Join Our Platform
            </a>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-12 flex flex-col items-center justify-center text-center flex-grow z-10">
        <div className="inline-flex items-center gap-2 bg-pink-500/10 border border-pink-500/30 text-pink-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-8 uppercase tracking-widest">
          <Sparkles className="w-3.5 h-3.5" /> Socialize Openly to Meet People with Open Hearts and Minds
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl leading-[1.1] mb-6">
          Connect Deeper. <br />
          <span className="bg-gradient-to-r from-pink-500 via-rose-400 to-white bg-clip-text text-transparent drop-shadow-[0_0_30px_rgba(236,72,153,0.2)]">
            Reveal Truly.
          </span>
        </h1>

        <p className="text-zinc-400 text-lg md:text-xl mb-12 font-light leading-relaxed text-left">
          Are you tired of playing games and wasting time in poinless conversations? are you tired of manipulations and lies everywhere trying to figure out people's real intentions?. Get hooked in our platform an find a partner with real and straightforward intentions (pre-grilled interests and desires statements). No Games! No Manipulations, Just honesty, Truth. Whether someone to just chat with and pass time, or to build a serious relationship we Got yuou covered. Everyone in out platform comes with pre-veted desires, pre-verified user profile from trusted refferals and securely verified account for your safety. In our platform, your privacy and safety is our primary concern; here, your basic stats (Name, Country, Profile Photo) are shared first, and full identity is unlocked securely through mutual approval.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md">
          <Link href="/auth">
            <a className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold px-8 py-4 rounded-full shadow-lg shadow-pink-500/30 hover:shadow-pink-500/50 hover:scale-[1.02] transition-all duration-300 text-center">
              Get Started Now
            </a>
          </Link>
          <a href="#features" className="w-full sm:w-auto text-zinc-300 hover:text-white font-medium px-8 py-4 rounded-full border border-zinc-700 hover:border-zinc-500 transition-all duration-300 text-center">
            Learn More
          </a>
        </div>

        {/* Animated Image Gallery */}
        <div className="w-full mt-32 mb-16 overflow-hidden relative">
          <div className="absolute inset-y-0 left-0 w-24 md:w-48 bg-gradient-to-r from-[#070408] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-24 md:w-48 bg-gradient-to-l from-[#070408] to-transparent z-10 pointer-events-none" />

          <div className="flex w-max animate-marquee">
            {[...images, ...images].map((img, idx) => (
              <div key={idx} className="w-56 md:w-72 h-72 md:h-96 flex-shrink-0 mx-3 md:mx-4 overflow-hidden rounded-2xl md:rounded-[2rem] border border-white/5 shadow-2xl hover:scale-[1.03] hover:shadow-pink-500/20 transition-all duration-500 cursor-pointer group">
                <img
                  src={img}
                  alt={`Gallery image ${idx}`}
                  className="w-full h-full object-cover group-hover:scale-110 group-hover:opacity-90 transition-all duration-700"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {/* About Us Section */}
        <div id="about" className="mt-12 mb-20 w-full text-center bg-[#120b12]/60 border border-pink-500/10 p-10 md:p-16 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-pink-500/30 transition-colors duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-pink-500/10 blur-[100px] pointer-events-none group-hover:bg-pink-500/20 transition-colors duration-700" />

          <h2 className="text-4xl md:text-5xl font-extrabold mb-8 tracking-tight bg-gradient-to-r from-white via-pink-100 to-pink-400 bg-clip-text text-transparent inline-flex items-center gap-4">
            <Heart className="w-8 h-8 text-pink-500 fill-pink-500/20" />
            About Us
          </h2>

          <p className="text-zinc-300 text-lg md:text-xl font-light leading-relaxed text-center md:text-justify">
            We are an American-based platform, and most of our clients and partners are looking for authentically beautiful women to build a future with. We have partners from all over the world, most of them tired of games in the current dating market and are looking for a serious partner.
          </p>

          <div className="mt-10 pt-8 border-t border-pink-500/10 max-w-2xl mx-auto">
            <div className="bg-pink-500/5 border border-pink-500/20 rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-pink-500"></div>
              <p className="text-pink-200/90 text-sm md:text-base font-medium leading-relaxed">
                To ensure access to your account on our platform, please maintain a fully authentic self and do not engage in any fraudulent activities that can cause harm to any member.
              </p>
            </div>
          </div>
          {/* Feature Highlights */}
          <div id="features" className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24">
            <div className="bg-[#120b12]/50 border border-pink-500/10 p-8 rounded-2xl hover:border-pink-500/30 transition-all duration-300 text-left backdrop-blur-sm group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Privacy First</h3>
              <p className="text-zinc-400 text-sm font-light">Only reveal full profile details after accepting a request.</p>
            </div>

            <div className="bg-[#120b12]/50 border border-pink-500/10 p-8 rounded-2xl hover:border-pink-500/30 transition-all duration-300 text-left backdrop-blur-sm group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Tailored Matching</h3>
              <p className="text-zinc-400 text-sm font-light">Select exact interactions: just chatting, planning meets, searching for friendships, or serious relationships.</p>
            </div>

            <div className="bg-[#120b12]/50 border border-pink-500/10 p-8 rounded-2xl hover:border-pink-500/30 transition-all duration-300 text-left backdrop-blur-sm group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500 mb-6 group-hover:scale-110 transition-transform duration-300">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Premium Perks</h3>
              <p className="text-zinc-400 text-sm font-light">Upgrade your profile to access premium matches and interactions.</p>
            </div>
          </div>
        </div>

        {/* Reviews Section */}
        <div id="reviews" className="mt-20 mb-16 w-full text-center bg-[#120b12]/40 border border-pink-500/10 p-10 md:p-16 rounded-[2.5rem] backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-pink-500/20 transition-colors duration-500">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/2 bg-pink-500/5 blur-[100px] pointer-events-none" />

          <h2 className="text-4xl md:text-5xl font-extrabold mb-4 tracking-tight bg-gradient-to-r from-white via-pink-100 to-pink-400 bg-clip-text text-transparent inline-flex items-center gap-4">
            <MessageSquare className="w-8 h-8 text-pink-500" />
            Member Reviews
          </h2>
          <p className="text-zinc-400 text-sm font-light mb-12 max-w-2xl mx-auto">
            See what our members from around the world have to say about their experiences and successful connections on Hooked.
          </p>

          {/* Reviews Grid */}
          {reviews.length === 0 ? (
            <p className="text-zinc-500 text-sm font-light italic mb-12">No reviews approved yet. Be the first to write a review!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 text-left">
              {reviews.map((rev) => (
                <div key={rev.id} className="bg-[#070408]/60 border border-white/5 p-6 rounded-2xl backdrop-blur-sm flex flex-col justify-between hover:border-pink-500/25 transition-all duration-300">
                  <div>
                    {/* Stars */}
                    <div className="flex gap-1 mb-4 text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-800'}`}
                        />
                      ))}
                    </div>
                    {/* Review text */}
                    <p className="text-zinc-300 text-sm font-light leading-relaxed mb-6 italic">
                      "{rev.message}"
                    </p>
                  </div>
                  {/* User info */}
                  <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                    <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-500 text-xs font-bold uppercase border border-pink-500/20">
                      {rev.reviewer_name?.[0]}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">{rev.reviewer_name}</p>
                      <p className="text-[10px] text-zinc-500">Verified Member</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Write a Review Section */}
          <div className="border-t border-pink-500/10 pt-12 max-w-2xl mx-auto">
            {user ? (
              <div className="bg-[#070408]/40 border border-pink-500/15 rounded-3xl p-6 md:p-8 text-left backdrop-blur-md">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <Star className="w-5 h-5 text-pink-500 fill-pink-500" />
                  Leave a Review
                </h3>
                <p className="text-zinc-400 text-xs font-light mb-6">
                  Share your experience with the community. Your review will be visible once approved by our administrators.
                </p>

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  {/* Interactive Star Selector */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">Your Rating</label>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setRating(s)}
                          onMouseEnter={() => setHoverRating(s)}
                          onMouseLeave={() => setHoverRating(null)}
                          className="focus:outline-none transition-transform hover:scale-110 cursor-pointer bg-transparent border-none p-0"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              s <= (hoverRating ?? rating) ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Message Input */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Review Message</label>
                    <textarea
                      required
                      placeholder="Write your review here... How did Hooked help you? What do you like about the platform?"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white resize-none"
                    />
                  </div>

                  {submitError && (
                    <p className="text-rose-400 text-xs font-semibold">{submitError}</p>
                  )}
                  {submitSuccess && (
                    <p className="text-emerald-400 text-xs font-semibold">{submitSuccess}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full sm:w-auto bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow-md shadow-pink-500/20 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-[#070408]/30 border border-white/5 rounded-3xl p-8 text-center backdrop-blur-md">
                <p className="text-zinc-300 text-sm font-light mb-4">
                  Only registered members can share their experiences.
                </p>
                <Link href="/auth">
                  <a className="inline-flex bg-white/10 hover:bg-white/20 border border-white/10 hover:border-pink-500/40 text-xs font-bold px-6 py-2.5 rounded-full transition-all duration-300">
                    Join Us to Write a Review
                  </a>
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-pink-500/10 py-6 text-center text-zinc-500 text-xs z-10 bg-[#070408]/90">
        &copy; {new Date().getFullYear()} Hooked.ink socialization platform. All rights reserved.
      </footer>

      {/* How It Works Modal */}
      {isHowItWorksOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300"
          onClick={() => setIsHowItWorksOpen(false)}
        >
          <div
            className="bg-[#120b12] border border-pink-500/20 max-w-2xl w-full rounded-[2.5rem] p-6 md:p-10 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-1/3 bg-pink-500/10 blur-[80px] pointer-events-none" />
            <button
              onClick={() => setIsHowItWorksOpen(false)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/5 transition-all cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>

            <h2 className="text-3xl font-extrabold mb-6 tracking-tight bg-gradient-to-r from-white via-pink-100 to-pink-400 bg-clip-text text-transparent inline-flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-pink-500" />
              How It Works
            </h2>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-sm font-bold shrink-0">1</span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Create Account & Login</h3>
                  <p className="text-zinc-400 text-xs font-light">Register a new profile and log in to access the platform's features.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-sm font-bold shrink-0">2</span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Scan the Website</h3>
                  <p className="text-zinc-400 text-xs font-light">Browse the discovery feed to check out profiles and scan through the website if you find what you love.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-sm font-bold shrink-0">3</span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Complete Profile Setup</h3>
                  <p className="text-zinc-400 text-xs font-light">Fill out your detailed profile characteristics, including your about me statement and profile pictures.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-[#25D366]/5 rounded-2xl border border-[#25D366]/20">
                <span className="w-8 h-8 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center text-[#25D366] text-sm font-bold shrink-0">4</span>
                <div>
                  <h3 className="text-sm font-bold text-[#25D366] mb-1">WhatsApp Verification</h3>
                  <p className="text-zinc-400 text-xs font-light">Text admin on WhatsApp on the bottom right corner to review your profile details and verify your status.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-sm font-bold shrink-0">5</span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Pay Subscription</h3>
                  <p className="text-zinc-400 text-xs font-light">Pay your subscription to unlock premium features, full details, and advanced routing capabilities.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-white/5 rounded-2xl border border-white/5">
                <span className="w-8 h-8 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-400 text-sm font-bold shrink-0">6</span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Wait for Admin Approval</h3>
                  <p className="text-zinc-400 text-xs font-light">Wait for the administrator to approve your profile setup to ensure safety and authenticity across our network.</p>
                </div>
              </div>

              <div className="flex gap-4 items-start p-4 bg-gradient-to-r from-pink-500/10 to-rose-500/10 rounded-2xl border border-pink-500/20">
                <span className="w-8 h-8 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center text-pink-400 text-sm font-bold shrink-0">7</span>
                <div>
                  <h3 className="text-sm font-bold text-white mb-1">Send Connection Requests</h3>
                  <p className="text-zinc-300 text-xs font-medium">Start sending connection requests to people you share chemistry with!</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
