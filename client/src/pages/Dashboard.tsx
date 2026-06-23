import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'wouter';
import api from '../lib/api';
import { Heart, Sparkles, MessageCircle, Check, X, ShieldAlert, Zap, Phone, CreditCard, Sliders, ChevronDown } from 'lucide-react';
import { io } from 'socket.io-client';

interface UserItem {
  id: string;
  names: string;
  country: string;
  interaction_preference: string;
  profile_picture?: string | null;
  email?: string;
  phone_number?: string;
  gender?: string;
  height?: string;
  body_shape?: string;
  about_me?: string | null;
  isConnected?: boolean;
  // Full properties when unlocked
  profiles?: {
    gender?: string | null;
    height?: string | null;
    skin_tone?: string | null;
    eye_color?: string | null;
    body_shape?: string | null;
    about_me?: string | null;
    images?: string[];
  };
}

interface PendingRequest {
  id: string;
  created_at: string;
  requester: {
    id: string;
    names: string;
    country: string;
    profile_picture?: string | null;
  };
}

const Dashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [activeUser, setActiveUser] = useState<UserItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card' | 'paypal'>('mpesa');
  const [phone, setPhone] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentMsg, setPaymentMsg] = useState<{ status: 'success' | 'error', text: string } | null>(null);

  // Fetch users & requests
  const fetchData = async () => {
    try {
      const usersRes = await api.get('/users');
      setUsers(usersRes.data);

      const requestsRes = await api.get('/connections/pending');
      setPendingRequests(requestsRes.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Socket.io integration
  useEffect(() => {
    if (!user) return;

    // Connect to the socket server using the base URL
    const socket = io('http://localhost:5000', {
      withCredentials: true,
    });

    // Register user to private room
    socket.emit('register', user.id);

    // Live events listeners
    socket.on('new_connection_request', (data: any) => {
      fetchData();
      alert(`🔔 New connection request from ${data.requester.names}!`);
    });

    socket.on('connection_accepted', (data: any) => {
      fetchData();
      refreshUser();
      alert(`💖 ${data.recipient.names} accepted your connection request!`);
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleSendRequest = async (recipientId: string) => {
    try {
      await api.post('/connections/request', { recipientId });
      alert('Connection request sent successfully! Waiting for recipient approval.');
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to send request');
    }
  };

  const handleRespondRequest = async (connectionId: string, status: 'accepted' | 'rejected') => {
    try {
      await api.put(`/connections/${connectionId}/respond`, { status });
      fetchData();
      refreshUser();
      alert(`Request ${status} successfully!`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to respond to request');
    }
  };

  const handleMPesaPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setPaymentLoading(true);
    setPaymentMsg(null);

    try {
      const res = await api.post('/payments/stk-push', {
        phone_number: phone,
        amount: 50, // Premium unlock price $50
      });
      if (res.data.success) {
        setPaymentMsg({
          status: 'success',
          text: 'Payment request initiated! Please check your phone for the M-Pesa prompt to complete verification.'
        });
        // Periodically refresh user premium state
        setTimeout(async () => {
          await refreshUser();
        }, 6000);
      }
    } catch (err: any) {
      setPaymentMsg({
        status: 'error',
        text: err.response?.data?.error || 'Failed to initiate M-Pesa payment.'
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName || !cardNumber || !cardExpiry || !cardCvv) return;
    setPaymentLoading(true);
    setPaymentMsg(null);

    try {
      const res = await api.post('/payments/card-payment', {
        cardholder_name: cardName,
        card_number: cardNumber,
        amount: 50,
      });
      if (res.data.success) {
        setPaymentMsg({
          status: 'success',
          text: 'Card payment processed successfully! You are now a VIP Premium member.'
        });
        await refreshUser();
      }
    } catch (err: any) {
      setPaymentMsg({
        status: 'error',
        text: err.response?.data?.error || 'Failed to process card payment.'
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePayPalPayment = async () => {
    setPaymentLoading(true);
    setPaymentMsg(null);

    try {
      const mockOrderId = `PAY-MOCK-${Date.now()}`;
      const res = await api.post('/payments/paypal-payment', {
        order_id: mockOrderId,
        amount: 50,
      });
      if (res.data.success) {
        setPaymentMsg({
          status: 'success',
          text: 'PayPal payment processed successfully! Welcome to VIP Gold.'
        });
        await refreshUser();
      }
    } catch (err: any) {
      setPaymentMsg({
        status: 'error',
        text: err.response?.data?.error || 'PayPal payment failed.'
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleViewProfile = async (targetUserId: string) => {
    try {
      const res = await api.get(`/users/${targetUserId}`);
      setActiveUser(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to load profile');
    }
  };

  return (
    <div className="min-h-screen bg-[#070408] text-white pl-0 md:pl-20 pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8">

        {/* Banner with Premium Check */}
        <div className="relative overflow-hidden bg-gradient-to-r from-pink-600/80 to-[#ff8fab]/80 border border-pink-500/30 rounded-3xl p-6 md:p-8 mb-8 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
          <div>
            <span className="bg-white/20 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider mb-2 inline-block">
              {user?.is_premium ? 'VIP Gold Active' : 'Basic Member'}
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Hey, {user?.names}!
            </h1>
            <p className="text-pink-100/90 text-sm font-light mt-1 max-w-xl">
              {user?.is_premium
                ? "You have unlocked premium discover tools! Explore rich profile connections seamlessly."
                : "Unlock full physical characteristics, eye colors, body shapes, & premium chat routes instantly."}
            </p>
          </div>

          {!user?.is_premium && user?.role !== 'admin' && (
            <div id="payment-section" className="bg-black/50 backdrop-blur-md p-5 rounded-2xl border border-white/10 w-full md:w-auto max-w-sm shrink-0 shadow-2xl">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-pink-400 fill-pink-400 animate-pulse" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-pink-400">Unlock VIP Premium ($50)</span>
              </div>

              {/* Payment Option Selector Dropdown */}
              <div className="mb-4">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Payment Method</label>
                <div className="relative">
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value as any);
                      setPaymentMsg(null);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-3 pr-8 py-2.5 outline-none text-xs text-white appearance-none cursor-pointer focus:border-pink-500/50 transition-all"
                  >
                    <option value="mpesa">Pay with M-Pesa </option>
                    <option value="card">Pay with Credit Card</option>
                    <option value="paypal">Pay with PayPal</option>
                  </select>
                  <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                    <ChevronDown className="w-3.5 h-3.5 text-zinc-500" />
                  </div>
                </div>
              </div>

              {/* Dynamic Payment Forms */}
              {paymentMethod === 'mpesa' && (
                <form onSubmit={handleMPesaPayment} className="space-y-3">
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 0712345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={paymentLoading}
                    className="w-full bg-pink-500 hover:bg-pink-600 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-white disabled:opacity-50"
                  >
                    {paymentLoading ? 'Initiating...' : 'Pay with M-Pesa'}
                  </button>
                </form>
              )}

              {paymentMethod === 'card' && (
                <form onSubmit={handleCardPayment} className="space-y-3">
                  <input
                    type="text"
                    required
                    placeholder="Cardholder Name"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white"
                  />
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      placeholder="1234 5678 1234 5678"
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                      maxLength={19}
                      className="w-full pl-9 pr-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      maxLength={5}
                      className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white text-center"
                    />
                    <input
                      type="password"
                      required
                      placeholder="CVV"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      maxLength={3}
                      className="w-full px-3 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white text-center"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={paymentLoading}
                    className="w-full bg-pink-500 hover:bg-pink-600 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 text-white disabled:opacity-50"
                  >
                    {paymentLoading ? 'Processing...' : 'Pay with Card'}
                  </button>
                </form>
              )}

              {paymentMethod === 'paypal' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                    Pay securely using PayPal checkout. You will be redirected to PayPal's secure portal to authorize your order.
                  </p>
                  <button
                    onClick={handlePayPalPayment}
                    disabled={paymentLoading}
                    className="w-full bg-[#ffc439] hover:bg-[#f2b92a] text-[#003087] font-extrabold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50"
                  >
                    {paymentLoading ? (
                      'Authorizing...'
                    ) : (
                      <>
                        <span className="italic font-bold">PayPal</span>
                        <span className="font-normal text-[10px]">Checkout</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {paymentMsg && (
                <p className={`text-[10px] mt-3 font-medium leading-relaxed ${paymentMsg.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {paymentMsg.text}
                </p>
              )}
            </div>
          )}

          {user?.role === 'admin' && (
            <div className="bg-[#120b12]/80 backdrop-blur-md p-5 rounded-2xl border border-pink-500/20 w-full md:w-auto max-w-sm shrink-0 flex flex-col justify-between shadow-2xl">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ShieldAlert className="w-5 h-5 text-pink-500" />
                  <span className="text-xs font-bold uppercase tracking-wider text-pink-400">Admin Mode Active</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-light">
                  You are logged in as a System Administrator. Access user directories, privileges, and system metrics.
                </p>
              </div>
              <button
                onClick={() => setLocation('/admin')}
                className="mt-4 bg-pink-500 hover:bg-pink-600 px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 w-full text-white"
              >
                <Sliders className="w-4 h-4" /> Go to Admin Panel
              </button>
            </div>
          )}
        </div>

        {/* Profile Completeness Warning Banner */}
        {user?.role !== 'admin' && (
          (!user?.profiles?.gender ||
            !user?.profiles?.height ||
            !user?.profiles?.skin_tone ||
            !user?.profiles?.eye_color ||
            !user?.profiles?.body_shape ||
            !user?.profiles?.about_me ||
            (user?.profiles?.images || []).length < 6)
        ) && (
            <div className="bg-amber-600/10 border border-amber-500/20 text-amber-200 rounded-3xl p-5 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md shadow-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">📢</span>
                  <h3 className="font-bold text-sm">Action Required: Complete Your Profile</h3>
                </div>
                <p className="text-zinc-400 text-xs mt-1 font-light">
                  Please complete your physical characteristics (gender, height, skin tone, eye color, body shape), write an About Me bio, and upload at least 6 gallery photos to unlock premium features and request details of other users!
                </p>
              </div>
              <button
                onClick={() => setLocation('/profile')}
                className="bg-amber-500 hover:bg-amber-600 text-black font-bold px-5 py-2.5 rounded-xl text-xs transition-all shrink-0 shadow-md cursor-pointer"
              >
                Update Profile Now
              </button>
            </div>
          )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Main Discover Feed */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-pink-500" />
              Discover People
            </h2>

            {loading ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-light">Loading profiles...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-light">No discoverable profiles found at the moment. Check back later!</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {users.map((profile) => (
                  <div key={profile.id} className="bg-[#120b12]/50 border border-pink-500/5 hover:border-pink-500/20 transition-all duration-300 rounded-3xl overflow-hidden group flex flex-col justify-between">
                    <div>
                      {/* Image section */}
                      <div className="relative aspect-square w-full bg-zinc-900 overflow-hidden">
                        {profile.profile_picture ? (
                          <img
                            src={profile.profile_picture}
                            alt={profile.names}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 text-xs">
                            <Heart className="w-12 h-12 stroke-[1]" />
                            <span className="mt-2">No Profile Image</span>
                          </div>
                        )}
                        <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-semibold text-pink-400 border border-pink-500/20">
                          {profile.interaction_preference.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="p-5 pb-2">
                        <h3 className="text-lg font-bold truncate">{profile.names}</h3>
                        <div className="flex flex-col gap-1 mt-1.5 text-xs text-zinc-400">
                          <p className="font-light">{profile.country || 'Unknown Location'}</p>
                          <div className="flex flex-wrap gap-2 text-zinc-500 font-light text-[11px] mt-0.5">
                            <span>Gender: <strong className="text-zinc-300 font-semibold">{profile.gender || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Height: <strong className="text-zinc-300 font-semibold">{profile.height || 'N/A'}</strong></span>
                            <span>•</span>
                            <span>Shape: <strong className="text-zinc-300 font-semibold">{profile.body_shape || 'N/A'}</strong></span>
                          </div>
                        </div>
                      </div>

                      {profile.about_me && (
                        <div className="px-5 pb-3">
                          <div className="p-3 bg-[#1e0c1f]/40 rounded-2xl border border-pink-500/10">
                            <span className="text-[9px] text-pink-400 block uppercase tracking-wider font-extrabold mb-1">About Me</span>
                            <p className="text-zinc-300 text-[11px] font-light leading-relaxed line-clamp-2">
                              {profile.about_me}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="px-5 pb-5 pt-0 flex gap-2">
                      <button
                        onClick={() => handleViewProfile(profile.id)}
                        className="flex-grow bg-white/5 hover:bg-white/10 text-xs font-semibold py-2.5 rounded-xl transition-all"
                      >
                        Inspect Details
                      </button>
                      <button
                        onClick={() => handleSendRequest(profile.id)}
                        className="bg-pink-500 hover:bg-pink-600 p-2.5 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                        title="Send Connect Request"
                      >
                        <Heart className="w-4 h-4 fill-white" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar Area: Pending Requests & Inspected Profile */}
          <div className="space-y-8">

            {/* Incoming Requests */}
            <div className="bg-[#120b12]/50 border border-pink-500/10 p-6 rounded-3xl backdrop-blur-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-pink-400 mb-4 flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                Connection Requests ({pendingRequests.length})
              </h3>
              {pendingRequests.length === 0 ? (
                <p className="text-zinc-600 text-xs font-light py-4 text-center">No pending request</p>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((req) => (
                    <div key={req.id} className="bg-black/30 p-3 rounded-2xl border border-white/5 flex justify-between items-center gap-2.5">
                      <div
                        className="flex items-center gap-3 min-w-0 cursor-pointer hover:opacity-85 flex-grow"
                        onClick={() => handleViewProfile(req.requester.id)}
                        title="Click to view sender profile"
                      >
                        <div className="w-8 h-8 rounded-full overflow-hidden bg-zinc-800 border border-pink-500/20 shrink-0">
                          {req.requester.profile_picture ? (
                            <img src={req.requester.profile_picture} alt={req.requester.names} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold bg-zinc-800 text-zinc-400">
                              {req.requester.names[0]}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{req.requester.names}</p>
                          <p className="text-[10px] text-zinc-500 truncate">{req.requester.country}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => handleRespondRequest(req.id, 'accepted')}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Accept Connection"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleRespondRequest(req.id, 'rejected')}
                          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 p-1.5 rounded-lg transition-all cursor-pointer"
                          title="Decline Connection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inspected Profile Card */}
            {activeUser && (() => {
              const isProfileConnected = !!activeUser.isConnected || activeUser.id === user?.id || user?.role === 'admin';
              return (
                <div className="bg-[#120b12]/60 border border-pink-500/20 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden">
                  <button
                    onClick={() => setActiveUser(null)}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  <h3 className="text-xs font-bold uppercase tracking-wider text-pink-400 mb-6 flex items-center gap-2">
                    <span>Connection Details</span>
                  </h3>

                  {/* Profile Gallery (Shown fully only when connected) */}
                  <div className="mb-6">
                    {isProfileConnected ? (
                      <div className="grid grid-cols-3 gap-2">
                        {activeUser.profiles?.images && activeUser.profiles.images.length > 0 ? (
                          activeUser.profiles.images.map((img, i) => (
                            <div key={i} className="aspect-square bg-zinc-900 rounded-lg overflow-hidden border border-white/5 group relative cursor-pointer">
                              <img 
                                src={img} 
                                alt={`${activeUser.names} pic ${i}`} 
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                                onClick={() => setPreviewImage(img)}
                              />
                            </div>
                          ))
                        ) : (
                          <div className="col-span-3 aspect-video bg-zinc-900 rounded-xl flex items-center justify-center text-zinc-600 text-xs">
                            <span>No images uploaded</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Show only the single profile picture */
                      <div className="relative aspect-square w-full bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 group">
                        {activeUser.profiles?.images && activeUser.profiles.images.length > 0 ? (
                          <img 
                            src={activeUser.profiles.images[0]} 
                            alt={activeUser.names} 
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 cursor-pointer"
                            onClick={() => setPreviewImage(activeUser.profiles?.images?.[0] || null)}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 text-xs">
                            <Heart className="w-12 h-12 stroke-[1]" />
                            <span className="mt-2">No Profile Image</span>
                          </div>
                        )}
                        <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-semibold text-pink-400 border border-pink-500/20">
                          {activeUser.interaction_preference.replace('_', ' ')}
                        </span>
                      </div>
                    )}
                  </div>

                  <h4 className="text-lg font-bold">{activeUser.names}</h4>
                  <p className="text-zinc-500 text-xs">{activeUser.country || 'Unknown Location'}</p>

                  {/* Characteristics Display */}
                  <div className="mt-6 space-y-3.5 border-t border-white/5 pt-4">
                    {isProfileConnected ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                        Connected Profile Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                        Basic Profile Preview
                      </span>
                    )}

                    <div className="grid grid-cols-2 gap-3.5 text-xs">
                      {/* About Me bio */}
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 col-span-2">
                        <span className="text-[10px] text-pink-400 block uppercase tracking-wider font-semibold">About Me</span>
                        <p className="text-zinc-200 text-xs mt-1 leading-relaxed whitespace-pre-line font-light">
                          {activeUser.profiles?.about_me || "This user hasn't written a bio yet."}
                        </p>
                      </div>

                      {isProfileConnected && (
                        <>
                          <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 col-span-2">
                            <span className="text-[10px] text-pink-400 block uppercase tracking-wider font-semibold">Email</span>
                            <span className="font-semibold text-zinc-200 select-all">{activeUser.email || 'Private'}</span>
                          </div>
                          <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 col-span-2">
                            <span className="text-[10px] text-pink-400 block uppercase tracking-wider font-semibold">Phone Number</span>
                            <span className="font-semibold text-zinc-200 select-all">{activeUser.phone_number || 'Private'}</span>
                          </div>
                        </>
                      )}
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Gender</span>
                        <span className="font-semibold text-zinc-200">{activeUser.profiles?.gender || 'N/A'}</span>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Height</span>
                        <span className="font-semibold text-zinc-200">{activeUser.profiles?.height || 'N/A'}</span>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Skin Tone</span>
                        <span className="font-semibold text-zinc-200">{activeUser.profiles?.skin_tone || 'N/A'}</span>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Eye Color</span>
                        <span className="font-semibold text-zinc-200">{activeUser.profiles?.eye_color || 'N/A'}</span>
                      </div>
                      <div className="bg-black/30 p-2.5 rounded-xl border border-white/5 col-span-2">
                        <span className="text-[10px] text-zinc-500 block uppercase tracking-wider">Body Shape</span>
                        <span className="font-semibold text-zinc-200">{activeUser.profiles?.body_shape || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {!isProfileConnected && (
                    // Not connected: show unlock CTA
                    <div className="mt-6 border-t border-white/5 pt-6 text-center space-y-4">
                      <ShieldAlert className="w-8 h-8 text-pink-500 mx-auto" />
                      <div>
                        <p className="text-xs font-semibold text-pink-400">Detailed Profile Locked</p>
                        <p className="text-[10px] text-zinc-500 mt-1">Contact details & full gallery are secured. Send a request to unlock connection profile.</p>
                      </div>
                      <button
                        onClick={() => handleSendRequest(activeUser.id)}
                        className="w-full bg-pink-500 hover:bg-pink-600 text-xs font-semibold py-2.5 rounded-xl transition-all"
                      >
                        Connect with {activeUser.names}
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>

        </div>

      </div>

      {previewImage && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4 transition-all duration-300"
          onClick={() => setPreviewImage(null)}
        >
          <button 
            className="absolute top-4 right-4 text-zinc-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
            onClick={() => setPreviewImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img 
            src={previewImage} 
            alt="Full view" 
            className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl border border-white/10 animate-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
