import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../App';
import Navigation from '../components/Navigation';
import ChatWindow, { formatOnlineStatus } from '../components/ChatWindow';
import { io } from 'socket.io-client';
import { 
  Heart, X, RotateCcw, Zap, Info, MapPin, ShieldCheck, Lock, 
  MessageSquare, MessageCircle, ChevronDown, Check, UserCheck,
  Wine, Cigarette, Dumbbell, Dog, Moon, BookOpen, MessageSquareText,
  Sparkles, CheckCircle2, ChevronRight, Clock
} from 'lucide-react';
import axios from 'axios';

interface DiscoverUser {
  id: string;
  full_name: string;
  country: string;
  profile_pic?: string;
  gender?: string;
  height?: string;
  skin_tone?: string;
  eye_color?: string;
  body_shape?: string;
  about_me?: string;
  is_premium_locked?: boolean;
  is_details_locked?: boolean;
  is_private_photos_locked?: boolean;
  private_photos_count?: number;
  connection_status?: 'pending' | 'accepted' | null;
  connection_id?: string;
  is_sender?: boolean;
  gallery?: string[];
  public_gallery?: string[];
  private_gallery?: string[];
  sexuality?: string;
  looking_for?: string;
  drinking?: string;
  smoking?: string;
  workout?: string;
  pets?: string;
  communication_style?: string;
  love_language?: string;
  education_level?: string;
  zodiac?: string;
  birth_date?: string;
  show_age?: boolean;
  is_approved?: boolean;
  is_liked?: boolean;
  last_active?: string;
}

interface ConnectionRequest {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_country: string;
  status: string;
  sender_gallery?: string[];
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // Feed list and deck indices
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  // Incoming Requests
  const [incomingRequests, setIncomingRequests] = useState<ConnectionRequest[]>([]);

  // Active chat state
  const [chatReceiver, setChatReceiver] = useState<{ id: string; name: string; status: 'pending' | 'accepted'; last_active?: string } | null>(null);

  // Online users presence
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Detailed profile slide-up drawer
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);

  // Premium lock upgrade modal
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Story-style photo index for the active card
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Likes management state
  const [showLikesModal, setShowLikesModal] = useState(false);
  const [likesTab, setLikesTab] = useState<'received' | 'sent'>('received');
  const [receivedLikes, setReceivedLikes] = useState<any[]>([]);
  const [sentLikes, setSentLikes] = useState<any[]>([]);
  const [loadingLikes, setLoadingLikes] = useState(false);

  // Gesture dragging states for swipe simulation
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const [exitAnimation, setExitAnimation] = useState<'left' | 'right' | null>(null);

  // Boost notification toast
  const [boostToast, setBoostToast] = useState<string | null>(null);

  const fetchDiscoverFeed = async () => {
    try {
      const res = await axios.get('/api/users/discover');
      setDiscoverUsers(res.data.users || []);
    } catch (err) {
      console.error('Failed to load discover users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikes = async () => {
    try {
      setLoadingLikes(true);
      const res = await axios.get('/api/connections/likes');
      setReceivedLikes(res.data.received_likes || []);
      setSentLikes(res.data.sent_likes || []);
    } catch (err) {
      console.error('Failed to load likes:', err);
    } finally {
      setLoadingLikes(false);
    }
  };

  const fetchConnectionsList = async () => {
    try {
      const res = await axios.get('/api/connections/list');
      const allConns = res.data.connections || [];
      const pendingIncoming = allConns.filter(
        (c: any) => c.receiver_id === user?.id && c.status === 'pending'
      );
      setIncomingRequests(pendingIncoming);
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  };

  useEffect(() => {
    fetchDiscoverFeed();
    fetchConnectionsList();
    fetchLikes();

    const socket = io(window.location.origin);
    if (user) {
      socket.emit('join', user.id);
    }

    socket.on('online_users_list', (ids: string[]) => {
      setOnlineUserIds(new Set(ids));
    });

    socket.on('user_presence', (data: { userId: string; isOnline: boolean }) => {
      setOnlineUserIds((prev) => {
        const next = new Set(prev);
        if (data.isOnline) {
          next.add(data.userId);
        } else {
          next.delete(data.userId);
        }
        return next;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  // Pre-fetch gallery images for next transitions
  useEffect(() => {
    setCurrentPhotoIndex(0);
    setDragOffset({ x: 0, y: 0 });
    setExitAnimation(null);
  }, [currentIndex]);

  const currentProfile = discoverUsers[currentIndex];
  const nextProfile = discoverUsers[(currentIndex + 1) % discoverUsers.length];

  // Helper to extract active photos
  const getGalleryPhotos = (profile?: DiscoverUser): string[] => {
    if (!profile) return [];
    if (profile.is_premium_locked) {
      return [profile.profile_pic || 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800'];
    }
    if (profile.gallery && profile.gallery.length > 0) {
      return profile.gallery;
    }
    if (profile.profile_pic) {
      return [profile.profile_pic];
    }
    return ['https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800'];
  };

  const currentPhotos = getGalleryPhotos(currentProfile);

  // Story-style photo navigation
  const handlePhotoTap = (e: React.MouseEvent | React.TouchEvent) => {
    if (isDragging || Math.abs(dragOffset.x) > 10) return;
    if (currentPhotos.length <= 1) return;

    // Get tap coordinate relative to the target card
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const tapX = clientX - rect.left;
    const width = rect.width;

    if (tapX < width * 0.35) {
      // Tap Left -> Previous Photo
      setCurrentPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentPhotos.length - 1));
    } else {
      // Tap Right -> Next Photo
      setCurrentPhotoIndex((prev) => (prev < currentPhotos.length - 1 ? prev + 1 : 0));
    }
  };

  // Swiping Actions
  const handleSwipeLeft = () => {
    if (discoverUsers.length === 0) return;
    setExitAnimation('left');
    setTimeout(() => {
      setExitAnimation(null);
      setDragOffset({ x: 0, y: 0 });
      setCurrentIndex((prev) => (prev + 1) % discoverUsers.length);
    }, 280);
  };

  const handleSwipeRight = async () => {
    if (!currentProfile) return;
    if (currentProfile.is_premium_locked || !user?.is_premium) {
      setShowUpgradeModal(true);
      return;
    }

    setExitAnimation('right');
    try {
      await axios.post('/api/connections/request', {
        receiver_id: currentProfile.id,
      });
      fetchDiscoverFeed();
    } catch (err) {
      console.error('Failed to send connection request:', err);
    }

    setTimeout(() => {
      setExitAnimation(null);
      setDragOffset({ x: 0, y: 0 });
      setCurrentIndex((prev) => (prev + 1) % discoverUsers.length);
    }, 280);
  };

  const handleRewind = () => {
    if (discoverUsers.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + discoverUsers.length) % discoverUsers.length);
  };

  const handleToggleLike = async (targetUser?: DiscoverUser | any) => {
    const target = targetUser || currentProfile;
    if (!target) return;

    try {
      const res = await axios.post('/api/connections/like', {
        target_id: target.id,
      });
      const nowLiked = res.data.liked;

      // Update local state in discoverUsers
      setDiscoverUsers((prev) =>
        prev.map((u) => (u.id === target.id ? { ...u, is_liked: nowLiked } : u))
      );

      // Refresh likes list
      fetchLikes();

      setBoostToast(nowLiked ? `Liked ${target.full_name}'s profile!` : `Unliked ${target.full_name}`);
      setTimeout(() => setBoostToast(null), 2500);
    } catch (err: any) {
      console.error('Toggle like error:', err);
    }
  };

  const handleOpenMessage = (targetUser?: DiscoverUser | any) => {
    const target = targetUser || currentProfile;
    if (!target) return;
    setChatReceiver({
      id: target.id,
      name: target.full_name,
      status: target.connection_status === 'accepted' ? 'accepted' : 'pending',
      last_active: target.last_active,
    });
  };

  const handleSuperBoost = () => {
    setBoostToast('Profile boosted with 10 tokens! Active for 30 minutes.');
    setTimeout(() => setBoostToast(null), 3500);
  };

  // Pointer & Touch Handlers
  const handlePointerDown = (clientX: number, clientY: number) => {
    dragStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    setIsDragging(true);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!isDragging) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = clientY - dragStartRef.current.y;
    setDragOffset({ x: dx, y: dy });
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const dx = dragOffset.x;
    const threshold = 90;

    if (dx > threshold) {
      handleSwipeRight();
    } else if (dx < -threshold) {
      handleSwipeLeft();
    } else {
      // Spring back to center
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // Calculate user age from birth_date
  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const birth = new Date(birthDate);
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    return age > 0 ? age : null;
  };

  const acceptConnectionRequest = async (id: string) => {
    try {
      await axios.post('/api/connections/accept', { connection_id: id });
      setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
      fetchDiscoverFeed();
    } catch (err) {
      console.error('Accept request error:', err);
    }
  };

  const declineConnectionRequest = async (id: string) => {
    try {
      await axios.post('/api/connections/decline', { connection_id: id });
      setIncomingRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Decline request error:', err);
    }
  };

  // Card transform math for Tinder dynamic rotation
  const rotationDeg = dragOffset.x * 0.08;
  const cardStyle = exitAnimation === 'left'
    ? { transform: 'translateX(-150%) rotate(-25deg)', opacity: 0, transition: 'all 0.3s ease-out' }
    : exitAnimation === 'right'
    ? { transform: 'translateX(150%) rotate(25deg)', opacity: 0, transition: 'all 0.3s ease-out' }
    : isDragging
    ? { transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y * 0.15}px) rotate(${rotationDeg}deg)`, transition: 'none' }
    : { transform: 'translateX(0) translateY(0) rotate(0)', transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)' };

  // Opacity for LIKE and NOPE stamps
  const likeOpacity = Math.min(Math.max((dragOffset.x - 20) / 70, 0), 1);
  const nopeOpacity = Math.min(Math.max((-dragOffset.x - 20) / 70, 0), 1);

  return (
    <div className="h-[100svh] min-h-[100dvh] w-full bg-black text-zinc-100 flex flex-col overflow-hidden select-none">
      
      {/* Top Navigation */}
      <Navigation />

      {/* Main Tinder Card Canvas - Full-bleed mobile container */}
      <main className="relative flex-1 w-full max-w-md mx-auto px-2 sm:px-4 py-2 flex flex-col justify-between overflow-hidden">
        
        {/* Top Quick Bar: Hooked Feed & Likes Access */}
        <div className="z-30 w-full mb-1 flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black uppercase tracking-wider text-rose-500 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" /> Hooked Match
            </span>
          </div>
          <button
            onClick={() => {
              fetchLikes();
              setShowLikesModal(true);
            }}
            className="flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-rose-500/40 px-3 py-1 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm"
          >
            <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500/20" />
            <span>Likes</span>
            {receivedLikes.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                {receivedLikes.length}
              </span>
            )}
          </button>
        </div>

        {/* Incoming Requests Banner Pill (if any) */}
        {incomingRequests.length > 0 && (
          <div className="z-30 w-full mb-1">
            <div className="flex items-center justify-between rounded-2xl bg-rose-500/10 border border-rose-500/20 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                <span className="text-[11px] font-bold text-rose-300">
                  {incomingRequests.length} Incoming Connection Request{incomingRequests.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => acceptConnectionRequest(incomingRequests[0].id)}
                  className="rounded-lg bg-rose-500 hover:bg-rose-600 px-2.5 py-1 text-[10px] font-bold text-white transition-all shadow-sm"
                >
                  Accept
                </button>
                <button
                  onClick={() => declineConnectionRequest(incomingRequests[0].id)}
                  className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-[10px] font-medium text-zinc-400"
                >
                  Decline
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Boost Toast Notification */}
        {boostToast && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 rounded-full bg-cyan-500/90 backdrop-blur-md px-4 py-1.5 text-xs font-bold text-white shadow-xl flex items-center gap-1.5 animate-in fade-in slide-in-from-top-3 duration-200">
            <Zap className="h-3.5 w-3.5 fill-white" />
            <span>{boostToast}</span>
          </div>
        )}

        {/* Card Deck Area */}
        <div className="relative flex-1 w-full flex items-center justify-center min-h-0">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
              <p className="text-xs text-zinc-500 font-medium tracking-wide">Finding matches nearby...</p>
            </div>
          ) : discoverUsers.length === 0 || !currentProfile ? (
            <div className="flex flex-col items-center justify-center text-center p-8 rounded-3xl border border-zinc-900 bg-zinc-950/60 max-w-xs space-y-4">
              <div className="h-16 w-16 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500">
                <Sparkles className="h-8 w-8" />
              </div>
              <h2 className="text-base font-bold text-white">There's no one new around you</h2>
              <p className="text-xs text-zinc-400 font-light leading-relaxed">
                You've reviewed all available profiles for now. Check back soon for new vetted members.
              </p>
              <button
                onClick={fetchDiscoverFeed}
                className="rounded-full bg-zinc-900 border border-zinc-800 px-5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-850"
              >
                Refresh Queue
              </button>
            </div>
          ) : (
            <div className="relative w-full h-full max-h-[72vh] flex items-center justify-center">
              
              {/* Secondary Background Card (Depth Effect) */}
              {nextProfile && (
                <div 
                  className="absolute inset-0 rounded-3xl overflow-hidden border border-zinc-900 bg-zinc-900/40 pointer-events-none transition-all duration-300"
                  style={{ transform: 'scale(0.95) translateY(10px)', opacity: 0.55 }}
                >
                  <img
                    src={getGalleryPhotos(nextProfile)[0]}
                    alt="Next profile preview"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent"></div>
                </div>
              )}

              {/* Active Foreground Card (Tinder Full-Bleed Card) */}
              <div
                style={cardStyle}
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                onMouseUp={handlePointerUp}
                onTouchStart={(e) => handlePointerDown(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchMove={(e) => handlePointerMove(e.touches[0].clientX, e.touches[0].clientY)}
                onTouchEnd={handlePointerUp}
                onClick={handlePhotoTap}
                className="relative z-20 w-full h-full rounded-3xl overflow-hidden border border-zinc-850/80 bg-zinc-950 shadow-[0_20px_50px_rgba(0,0,0,0.8)] cursor-grab active:cursor-grabbing select-none"
              >
                {/* Photo Layer */}
                <img
                  src={currentPhotos[currentPhotoIndex] || currentProfile.profile_pic}
                  alt={currentProfile.full_name}
                  className="h-full w-full object-cover pointer-events-none transition-opacity duration-200"
                />

                {/* Story-Style Top Segmented Progress Bars */}
                {currentPhotos.length > 1 && (
                  <div className="absolute top-3 inset-x-3 z-30 flex items-center gap-1.5 pointer-events-none">
                    {currentPhotos.map((_, idx) => (
                      <div
                        key={idx}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                          idx === currentPhotoIndex 
                            ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' 
                            : 'bg-white/35 backdrop-blur-sm'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Subtle top scrim for story bars */}
                <div className="absolute top-0 inset-x-0 h-16 bg-gradient-to-b from-black/60 to-transparent pointer-events-none z-10" />

                {/* Deep bottom gradient scrim for readable typography */}
                <div className="absolute bottom-0 inset-x-0 h-64 bg-gradient-to-t from-black via-black/60 to-transparent pointer-events-none z-10" />

                {/* Dynamic Drag Stamp Cues (Tinder LIKE / NOPE stamps) */}
                {likeOpacity > 0 && (
                  <div 
                    style={{ opacity: likeOpacity }}
                    className="absolute top-10 left-6 z-40 rounded-xl border-4 border-emerald-400 bg-emerald-950/40 backdrop-blur-sm px-4 py-1.5 text-2xl font-black text-emerald-400 -rotate-12 tracking-widest pointer-events-none shadow-[0_0_20px_rgba(52,211,153,0.6)]"
                  >
                    LIKE
                  </div>
                )}

                {nopeOpacity > 0 && (
                  <div 
                    style={{ opacity: nopeOpacity }}
                    className="absolute top-10 right-6 z-40 rounded-xl border-4 border-rose-500 bg-rose-950/40 backdrop-blur-sm px-4 py-1.5 text-2xl font-black text-rose-500 rotate-12 tracking-widest pointer-events-none shadow-[0_0_20px_rgba(244,63,94,0.6)]"
                  >
                    NOPE
                  </div>
                )}

                {/* Bottom Overlay: Profile Info & Quick Attributes */}
                <div className="absolute bottom-4 left-4 right-4 z-20 text-left pointer-events-none">
                  
                  {/* Name, Age, Verification & Privacy Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <h2 className="text-2xl font-black text-white tracking-tight">
                        {currentProfile.full_name}
                      </h2>
                      {calculateAge(currentProfile.birth_date) && (
                        <span className="text-xl font-light text-zinc-300">
                          {calculateAge(currentProfile.birth_date)}
                        </span>
                      )}
                      {currentProfile.is_approved && (
                        <span title="Verified Profile" className="inline-flex text-emerald-400">
                          <ShieldCheck className="h-5 w-5 fill-emerald-500/20" />
                        </span>
                      )}

                      {/* Connection / Private status badge */}
                      {currentProfile.connection_status === 'accepted' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2 py-0.5 text-[9px] font-bold text-emerald-300 backdrop-blur-md">
                          <Sparkles className="h-2.5 w-2.5" /> Hooked
                        </span>
                      ) : currentProfile.connection_status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-bold text-amber-300 backdrop-blur-md">
                          <Clock className="h-2.5 w-2.5" /> Request Pending
                        </span>
                      ) : null}
                    </div>

                    {/* Info Button to Open Slide-Up Drawer */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDetailDrawer(true);
                      }}
                      className="pointer-events-auto rounded-full bg-zinc-950/70 border border-zinc-700/60 p-2 text-white hover:bg-zinc-900 transition-all active:scale-95 shadow-md"
                      aria-label="View Full Profile"
                    >
                      <Info className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Location & Online Presence Indicator */}
                  <div className="flex items-center gap-3 text-xs font-medium mt-0.5">
                    <div className="flex items-center gap-1.5 text-rose-400">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{currentProfile.country}</span>
                    </div>
                    {(() => {
                      const status = formatOnlineStatus(
                        onlineUserIds.has(currentProfile.id),
                        currentProfile.last_active
                      );
                      return (
                        <div className="flex items-center gap-1 text-[11px]">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              status.isOnline
                                ? 'bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse'
                                : 'bg-zinc-500'
                            }`}
                          />
                          <span className={status.isOnline ? 'text-emerald-400 font-semibold' : 'text-zinc-300 font-normal'}>
                            {status.label}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Quick Bio snippet */}
                  {currentProfile.about_me && (
                    <p className="text-xs text-zinc-300 font-light line-clamp-2 mt-2 leading-relaxed">
                      {currentProfile.about_me}
                    </p>
                  )}

                  {/* Quick Attribute Pills (Physical traits public for all) */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {currentProfile.gender && (
                      <span className="rounded-full bg-white/10 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-zinc-200">
                        {currentProfile.gender.toUpperCase()}
                      </span>
                    )}
                    {currentProfile.height && (
                      <span className="rounded-full bg-white/10 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-zinc-200">
                        {currentProfile.height} ft
                      </span>
                    )}
                    {currentProfile.body_shape && (
                      <span className="rounded-full bg-white/10 backdrop-blur-md px-2.5 py-0.5 text-[10px] font-medium text-zinc-200">
                        {currentProfile.body_shape}
                      </span>
                    )}
                    {currentProfile.is_private_photos_locked && (currentProfile.private_photos_count || 0) > 0 && (
                      <span className="rounded-full bg-amber-500/20 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold text-amber-300 flex items-center gap-1">
                        <Lock className="h-2.5 w-2.5" /> {currentProfile.private_photos_count} Private Photos
                      </span>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>

        {/* Bottom Floating Action Controls */}
        {currentProfile && !currentProfile.is_premium_locked && (
          <div className="z-30 py-2 flex items-center justify-center gap-2.5 sm:gap-3.5">
            
            {/* Rewind Button */}
            <button
              onClick={handleRewind}
              title="Previous Profile"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-amber-500/30 bg-zinc-950/80 backdrop-blur-md text-amber-400 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(245,158,11,0.15)]"
            >
              <RotateCcw className="h-4.5 w-4.5" />
            </button>

            {/* Pass / Nope Button */}
            <button
              onClick={handleSwipeLeft}
              title="Pass Profile"
              className="h-12 w-12 sm:h-13 sm:w-13 rounded-full border border-rose-500/40 bg-zinc-950/90 backdrop-blur-md text-rose-500 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_4px_25px_rgba(244,63,94,0.25)]"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Send Message Button */}
            <button
              onClick={() => handleOpenMessage(currentProfile)}
              title="Send Message"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-sky-500/40 bg-zinc-950/90 backdrop-blur-md text-sky-400 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(14,165,233,0.25)]"
            >
              <MessageCircle className="h-5 w-5" />
            </button>

            {/* Like Button */}
            <button
              onClick={() => handleToggleLike(currentProfile)}
              title={currentProfile.is_liked ? "Unlike Profile" : "Like Profile"}
              className={`h-13 w-13 sm:h-14 sm:w-14 rounded-full border backdrop-blur-md flex items-center justify-center hover:scale-110 active:scale-95 transition-all ${
                currentProfile.is_liked
                  ? 'border-rose-500 bg-rose-500 text-white shadow-[0_0_25px_rgba(244,63,94,0.6)]'
                  : 'border-rose-500/40 bg-zinc-950/90 text-rose-400 shadow-[0_4px_25px_rgba(244,63,94,0.25)]'
              }`}
            >
              <Heart className={`h-6 w-6 sm:h-7 sm:w-7 ${currentProfile.is_liked ? 'fill-white' : 'fill-rose-500/20'}`} />
            </button>

            {/* Connect Button */}
            <button
              onClick={handleSwipeRight}
              title="Send Connection Request"
              className="h-11 w-11 sm:h-12 sm:w-12 rounded-full border border-emerald-500/40 bg-zinc-950/90 backdrop-blur-md text-emerald-400 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_4px_20px_rgba(16,185,129,0.25)]"
            >
              <UserCheck className="h-5 w-5" />
            </button>

            {/* Info / Slide-Up Details Button */}
            <button
              onClick={() => setShowDetailDrawer(true)}
              title="View Details"
              className="h-10 w-10 sm:h-11 sm:w-11 rounded-full border border-indigo-500/30 bg-zinc-950/80 backdrop-blur-md text-indigo-400 flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-[0_4px_15px_rgba(99,102,241,0.15)]"
            >
              <Info className="h-4.5 w-4.5" />
            </button>

          </div>
        )}

      </main>

      {/* SLIDE-UP DETAILED PROFILE DRAWER */}
      {showDetailDrawer && currentProfile && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg mx-auto bg-zinc-950 border-t border-zinc-800 rounded-t-3xl max-h-[85svh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300"
          >
            {/* Drawer Header & Handle */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-zinc-900">
              <div className="h-1.5 w-12 rounded-full bg-zinc-800 mx-auto" />
              <button
                onClick={() => setShowDetailDrawer(false)}
                className="absolute right-4 top-4 rounded-full bg-zinc-900 p-1.5 text-zinc-400 hover:text-white"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto px-6 py-5 space-y-6">
              
              {/* Identity Header */}
              <div className="space-y-1 text-left">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-2xl font-black text-white">{currentProfile.full_name}</h2>
                  {calculateAge(currentProfile.birth_date) && (
                    <span className="text-2xl font-light text-zinc-400">
                      {calculateAge(currentProfile.birth_date)}
                    </span>
                  )}
                  {currentProfile.is_approved && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                      <ShieldCheck className="h-3.5 w-3.5" /> Verified
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <p className="text-rose-400 font-medium flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {currentProfile.country}
                  </p>
                  {(() => {
                    const status = formatOnlineStatus(
                      onlineUserIds.has(currentProfile.id),
                      currentProfile.last_active
                    );
                    return (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            status.isOnline
                              ? 'bg-emerald-400 ring-2 ring-emerald-500/20 animate-pulse'
                              : 'bg-zinc-500'
                          }`}
                        />
                        <span className={status.isOnline ? 'text-emerald-400 font-semibold' : 'text-zinc-400'}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* About Me */}
              {currentProfile.about_me && (
                <div className="space-y-2 text-left">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">About Me</h4>
                  <p className="text-sm text-zinc-200 leading-relaxed font-light bg-zinc-900/40 p-4 rounded-2xl border border-zinc-900">
                    {currentProfile.about_me}
                  </p>
                </div>
              )}

              {/* Physical Characteristics (Public to all users) */}
              <div className="space-y-2 text-left">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Physical Characteristics</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {currentProfile.gender && (
                    <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-2.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-bold">Gender</span>
                      <span className="text-xs text-white capitalize">{currentProfile.gender}</span>
                    </div>
                  )}
                  {currentProfile.height && (
                    <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-2.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-bold">Height</span>
                      <span className="text-xs text-white">{currentProfile.height} ft</span>
                    </div>
                  )}
                  {currentProfile.skin_tone && (
                    <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-2.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-bold">Skin Tone</span>
                      <span className="text-xs text-white capitalize">{currentProfile.skin_tone}</span>
                    </div>
                  )}
                  {currentProfile.eye_color && (
                    <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-2.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-bold">Eye Color</span>
                      <span className="text-xs text-white capitalize">{currentProfile.eye_color}</span>
                    </div>
                  )}
                  {currentProfile.body_shape && (
                    <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-2.5">
                      <span className="block text-[9px] text-zinc-500 uppercase font-bold">Body Shape</span>
                      <span className="text-xs text-white capitalize">{currentProfile.body_shape}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lifestyle & Habits Breakdown */}
              {currentProfile.is_details_locked ? (
                <div className="rounded-2xl bg-zinc-900/60 border border-zinc-850 p-5 text-center space-y-2">
                  <Lock className="h-6 w-6 text-rose-500 mx-auto" />
                  <h5 className="text-xs font-bold text-zinc-200">Habits & Lifestyle Locked</h5>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    Send {currentProfile.full_name} a connection request to unlock their habits, education, love languages, and full photo gallery.
                  </p>
                  <button
                    onClick={() => {
                      setShowDetailDrawer(false);
                      handleSwipeRight();
                    }}
                    className="mt-2 rounded-full bg-rose-500 px-5 py-2 text-xs font-bold text-white hover:bg-rose-600 transition-all"
                  >
                    Send Connection Request
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Lifestyle & Details</h4>
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    {currentProfile.looking_for && (
                      <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-3">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase">Looking For</span>
                        <span className="text-xs text-white mt-0.5 block">{currentProfile.looking_for}</span>
                      </div>
                    )}
                    {currentProfile.drinking && (
                      <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-3">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                          <Wine className="h-3 w-3 text-amber-400" /> Drinking
                        </span>
                        <span className="text-xs text-white mt-0.5 block">{currentProfile.drinking}</span>
                      </div>
                    )}
                    {currentProfile.smoking && (
                      <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-3">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                          <Cigarette className="h-3 w-3 text-zinc-400" /> Smoking
                        </span>
                        <span className="text-xs text-white mt-0.5 block">{currentProfile.smoking}</span>
                      </div>
                    )}
                    {currentProfile.workout && (
                      <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-3">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                          <Dumbbell className="h-3 w-3 text-rose-400" /> Workout
                        </span>
                        <span className="text-xs text-white mt-0.5 block">{currentProfile.workout}</span>
                      </div>
                    )}
                    {currentProfile.pets && (
                      <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-3">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                          <Dog className="h-3 w-3 text-orange-400" /> Pets
                        </span>
                        <span className="text-xs text-white mt-0.5 block">{currentProfile.pets}</span>
                      </div>
                    )}
                    {currentProfile.zodiac && (
                      <div className="rounded-xl bg-zinc-900/50 border border-zinc-850 p-3">
                        <span className="block text-[10px] text-zinc-500 font-bold uppercase flex items-center gap-1">
                          <Moon className="h-3 w-3 text-purple-400" /> Zodiac
                        </span>
                        <span className="text-xs text-white mt-0.5 block">{currentProfile.zodiac}</span>
                      </div>
                    )}
                  </div>

                  {/* Personal Languages & Education */}
                  <div className="space-y-2 pt-2 border-t border-zinc-900 text-xs">
                    {currentProfile.love_language && (
                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500">Love Language:</span>
                        <span className="text-zinc-200 font-medium">{currentProfile.love_language}</span>
                      </div>
                    )}
                    {currentProfile.communication_style && (
                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500">Communication:</span>
                        <span className="text-zinc-200 font-medium">{currentProfile.communication_style}</span>
                      </div>
                    )}
                    {currentProfile.education_level && (
                      <div className="flex justify-between py-1">
                        <span className="text-zinc-500">Education:</span>
                        <span className="text-zinc-200 font-medium">{currentProfile.education_level}</span>
                      </div>
                    )}
                  </div>

                  {/* Full Photo Showcase */}
                  {currentProfile.gallery && currentProfile.gallery.length > 0 && (
                    <div className="space-y-3 pt-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                          Photos ({currentProfile.gallery.length})
                        </h4>
                        {currentProfile.is_private_photos_locked && (currentProfile.private_photos_count || 0) > 0 && (
                          <span className="text-[10px] text-amber-400 font-bold flex items-center gap-1">
                            <Lock className="h-2.5 w-2.5" /> {currentProfile.private_photos_count} Private Photos Locked
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {currentProfile.gallery.map((imgUrl, i) => {
                          const isPrivatePhoto = currentProfile.private_gallery?.includes(imgUrl);
                          return (
                            <div key={i} className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 group">
                              <img src={imgUrl} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                              <span className={`absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[8px] font-bold ${
                                isPrivatePhoto 
                                  ? 'bg-amber-500/80 text-black' 
                                  : 'bg-black/70 text-white'
                              }`}>
                                {isPrivatePhoto ? '🔒 Hooked Private' : '🌐 Public'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Locked Private Photos Notification */}
                      {currentProfile.is_private_photos_locked && (currentProfile.private_photos_count || 0) > 0 && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-center space-y-1">
                          <Lock className="h-4 w-4 text-amber-400 mx-auto" />
                          <span className="text-xs font-bold text-amber-300 block">
                            {currentProfile.private_photos_count} Profile Private Photos Locked
                          </span>
                          <p className="text-[10px] text-zinc-400 font-light">
                            These photos are private and will automatically unlock once you both hook up (accepted connection)!
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              )}

              {/* Bottom Sticky Action inside Sheet */}
              <div className="sticky bottom-0 pt-4 pb-2 bg-zinc-950 border-t border-zinc-900 flex items-center gap-2">
                <button
                  onClick={() => {
                    setShowDetailDrawer(false);
                    handleSwipeLeft();
                  }}
                  className="flex-1 rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-850 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="h-4 w-4 text-rose-500" /> Pass
                </button>
                <button
                  onClick={() => handleToggleLike(currentProfile)}
                  className={`flex-1 rounded-xl py-3 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 border ${
                    currentProfile.is_liked
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-zinc-900 border-zinc-800 text-rose-400 hover:border-rose-500/40'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${currentProfile.is_liked ? 'fill-white' : 'fill-rose-500/20'}`} />
                  {currentProfile.is_liked ? 'Liked' : 'Like'}
                </button>
                <button
                  onClick={() => {
                    setShowDetailDrawer(false);
                    handleOpenMessage(currentProfile);
                  }}
                  className="flex-1 rounded-xl bg-sky-500/10 border border-sky-500/30 py-3 text-xs font-bold text-sky-400 hover:bg-sky-500 hover:text-white transition-colors flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="h-4 w-4" /> Message
                </button>
                <button
                  onClick={() => {
                    setShowDetailDrawer(false);
                    handleSwipeRight();
                  }}
                  className="flex-1 rounded-xl bg-rose-500 py-3 text-xs font-bold text-white hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-rose-500/20"
                >
                  <UserCheck className="h-4 w-4" /> Connect
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* CHAT WINDOW OVERLAY */}
      {chatReceiver && (
        <ChatWindow
          receiverId={chatReceiver.id}
          receiverName={chatReceiver.name}
          connectionStatus={chatReceiver.status}
          receiverLastActive={chatReceiver.last_active}
          onClose={() => setChatReceiver(null)}
        />
      )}

      {/* PREMIUM UPGRADE MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
          <div className="w-full max-w-sm rounded-3xl border border-rose-500/20 bg-zinc-950 p-6 text-center space-y-4 shadow-2xl">
            <div className="h-14 w-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-500 mx-auto">
              <Lock className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-black text-white">Unlock Unlimited Swiping</h3>
            <p className="text-xs text-zinc-400 leading-relaxed font-light">
              Upgrade to Hooked Premium to send unlimited connection requests, browse all photo galleries, and chat freely.
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button 
                onClick={() => setLocation('/wallet')}
                className="w-full rounded-xl bg-rose-500 py-3 text-xs font-bold text-white hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/25"
              >
                Go to Wallet ($19.99)
              </button>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIKES LIST MODAL / DRAWER */}
      {showLikesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[85vh] rounded-3xl border border-zinc-800 bg-zinc-950 flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-900 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="rounded-full bg-rose-500/10 p-2 text-rose-500">
                  <Heart className="h-5 w-5 fill-rose-500/20" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Likes Activity</h3>
                  <p className="text-[11px] text-zinc-500">Review members who liked your profile or you showed interest in</p>
                </div>
              </div>
              <button
                onClick={() => setShowLikesModal(false)}
                className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-zinc-900 bg-zinc-950/60 px-6 pt-3 gap-4">
              <button
                onClick={() => setLikesTab('received')}
                className={`pb-3 text-xs font-bold transition-colors relative ${
                  likesTab === 'received' ? 'text-rose-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Liked Me ({receivedLikes.length})
                {likesTab === 'received' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-rose-500"></span>
                )}
              </button>
              <button
                onClick={() => setLikesTab('sent')}
                className={`pb-3 text-xs font-bold transition-colors relative ${
                  likesTab === 'sent' ? 'text-rose-500' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                Profiles I Liked ({sentLikes.length})
                {likesTab === 'sent' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-rose-500"></span>
                )}
              </button>
            </div>

            {/* List Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
              {loadingLikes ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent"></div>
                  <p className="text-xs text-zinc-500">Loading likes...</p>
                </div>
              ) : (likesTab === 'received' ? receivedLikes : sentLikes).length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-12 space-y-3">
                  <div className="h-14 w-14 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-600">
                    <Heart className="h-7 w-7" />
                  </div>
                  <h4 className="text-sm font-bold text-zinc-300">
                    {likesTab === 'received' ? 'No incoming likes yet' : 'You haven’t liked anyone yet'}
                  </h4>
                  <p className="text-xs text-zinc-500 max-w-xs font-light">
                    {likesTab === 'received'
                      ? 'Keep your profile active and updated with genuine photos to gain attention from other members.'
                      : 'Explore the Hooked discover deck and tap the heart to express interest in members.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(likesTab === 'received' ? receivedLikes : sentLikes).map((likeUser: any) => (
                    <div
                      key={likeUser.like_id || likeUser.id}
                      className="group rounded-2xl border border-zinc-850 bg-zinc-900/40 p-3.5 flex flex-col justify-between hover:border-zinc-700 transition-all shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative h-14 w-14 shrink-0 rounded-xl overflow-hidden bg-zinc-800">
                          {likeUser.profile_pic ? (
                            <img
                              src={likeUser.profile_pic}
                              alt={likeUser.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-xs font-bold text-zinc-400">
                              {likeUser.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-white truncate">{likeUser.full_name}</h4>
                            {calculateAge(likeUser.birth_date) && (
                              <span className="text-[11px] text-zinc-400">
                                {calculateAge(likeUser.birth_date)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] text-zinc-400 flex items-center gap-1 truncate">
                              <MapPin className="h-2.5 w-2.5 text-rose-500 shrink-0" /> {likeUser.country}
                            </p>
                            <span className="text-zinc-600 text-[10px]">•</span>
                            {(() => {
                              const status = formatOnlineStatus(
                                onlineUserIds.has(likeUser.id),
                                likeUser.last_active
                              );
                              return (
                                <span className={`text-[10px] flex items-center gap-1 ${status.isOnline ? 'text-emerald-400 font-medium' : 'text-zinc-500'}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${status.isOnline ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                                  {status.label}
                                </span>
                              );
                            })()}
                          </div>
                          <span className="text-[9px] text-zinc-500 block mt-1">
                            {new Date(likeUser.liked_at).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="mt-3 pt-2.5 border-t border-zinc-850/80 flex items-center gap-2">
                        <button
                          onClick={() => {
                            setShowLikesModal(false);
                            handleOpenMessage(likeUser);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-sky-500/10 border border-sky-500/20 py-1.5 text-[10px] font-semibold text-sky-400 hover:bg-sky-500 hover:text-white transition-colors"
                        >
                          <MessageCircle className="h-3 w-3" /> Message
                        </button>
                        
                        {likesTab === 'received' ? (
                          <button
                            onClick={() => handleToggleLike(likeUser)}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-rose-500 py-1.5 text-[10px] font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm"
                          >
                            <Heart className="h-3 w-3 fill-white" /> Like Back
                          </button>
                        ) : (
                          <button
                            onClick={() => handleToggleLike(likeUser)}
                            className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 py-1.5 text-[10px] font-medium text-zinc-300 transition-colors"
                          >
                            <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> Liked
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
