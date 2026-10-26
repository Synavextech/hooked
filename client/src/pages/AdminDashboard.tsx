import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../App';
import Navigation from '../components/Navigation';
import { 
  ShieldCheck, FileCheck, MessageSquare, AlertCircle, CheckCircle2, 
  Trash2, ThumbsUp, ThumbsDown, User, Heart, CreditCard, Coins, Check, X
} from 'lucide-react';
import axios from 'axios';

interface PendingProfile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  country: string;
  gender: string;
  height: string;
  body_shape: string;
  skin_tone: string;
  eye_color: string;
  about_me: string;
  gallery: string[];
}

interface Review {
  id: string;
  full_name: string;
  email: string;
  rating: number;
  message: string;
  is_approved: boolean;
}

interface AdminPayment {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  country: string;
  provider: string;
  package_type: string;
  amount: string;
  currency: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  provider_transaction_id?: string;
  metadata?: any;
  created_at: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<'profiles' | 'reviews' | 'payments'>('profiles');

  // Data states
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [payments, setPayments] = useState<AdminPayment[]>([]);

  // UI Status
  const [loading, setLoading] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const fetchPendingProfiles = async () => {
    try {
      const res = await axios.get('/api/admin/pending-profiles');
      setPendingProfiles(res.data.profiles || []);
    } catch (err) {
      console.error('Failed to load pending profiles:', err);
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await axios.get('/api/admin/reviews');
      setReviews(res.data.reviews || []);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    }
  };

  const fetchPayments = async () => {
    try {
      const res = await axios.get('/api/admin/payments');
      setPayments(res.data.payments || []);
    } catch (err) {
      console.error('Failed to load payments:', err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchPendingProfiles(), fetchReviews(), fetchPayments()]);
    setLoading(false);
  };

  useEffect(() => {
    if (user?.role !== 'admin') {
      setLocation('/');
      return;
    }
    initData();
  }, [user]);

  // Approve profile handler
  const handleApproveProfile = async (profileId: string) => {
    setStatusMsg(null);
    try {
      await axios.post(`/api/admin/approve-profile/${profileId}`);
      setStatusMsg('Profile approved successfully.');
      setTimeout(() => setStatusMsg(null), 3000);
      fetchPendingProfiles();
    } catch (err) {
      alert('Failed to approve profile.');
    }
  };

  // Disapprove profile handler
  const handleRejectProfile = async (profileId: string) => {
    const reason = prompt('Enter reason for profile flagging:');
    if (reason === null) return; // cancel click

    setStatusMsg(null);
    try {
      await axios.post(`/api/admin/reject-profile/${profileId}`, { reason });
      setStatusMsg('Profile flagged/rejected successfully.');
      setTimeout(() => setStatusMsg(null), 3000);
      fetchPendingProfiles();
    } catch (err) {
      alert('Failed to flag profile.');
    }
  };

  // Approve review handler
  const handleApproveReview = async (reviewId: string) => {
    setStatusMsg(null);
    try {
      await axios.post(`/api/admin/approve-review/${reviewId}`);
      setStatusMsg('Review approved for landing page.');
      setTimeout(() => setStatusMsg(null), 3000);
      fetchReviews();
    } catch (err) {
      alert('Failed to approve review.');
    }
  };

  // Delete review handler
  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;
    
    setStatusMsg(null);
    try {
      await axios.delete(`/api/admin/delete-review/${reviewId}`);
      setStatusMsg('Review deleted successfully.');
      setTimeout(() => setStatusMsg(null), 3000);
      fetchReviews();
    } catch (err) {
      alert('Failed to delete review.');
    }
  };

  // Approve payment handler (Matching crypto or manual credit)
  const handleApprovePayment = async (paymentId: string) => {
    setStatusMsg(null);
    try {
      await axios.post(`/api/admin/approve-payment/${paymentId}`);
      setStatusMsg('Payment approved and user credited successfully.');
      setTimeout(() => setStatusMsg(null), 3000);
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to approve payment.');
    }
  };

  // Reject payment handler
  const handleRejectPayment = async (paymentId: string) => {
    const reason = prompt('Enter reason for payment rejection (optional):');
    if (reason === null) return;
    setStatusMsg(null);
    try {
      await axios.post(`/api/admin/reject-payment/${paymentId}`, { reason });
      setStatusMsg('Payment marked as rejected/failed.');
      setTimeout(() => setStatusMsg(null), 3000);
      fetchPayments();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to reject payment.');
    }
  };

  const pendingPaymentsCount = payments.filter((p) => p.status === 'pending').length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28">
      <Navigation />

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-rose-500" />
            <div>
              <h1 className="text-2xl font-black text-white">Administration Dashboard</h1>
              <p className="text-xs text-zinc-500 font-light">Verify uploaded media, profiles, reviews, and payments.</p>
            </div>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex rounded-xl bg-zinc-950 p-1 border border-zinc-900 w-fit flex-wrap gap-1">
          <button
            onClick={() => setActiveTab('profiles')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === 'profiles' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Verify Profiles ({pendingProfiles.length})
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === 'reviews' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Manage Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'payments' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Payments & Crypto</span>
            {pendingPaymentsCount > 0 && (
              <span className="rounded-full bg-amber-500 text-black px-1.5 py-0.2 text-[9px] font-black">
                {pendingPaymentsCount}
              </span>
            )}
          </button>
        </div>

        {statusMsg && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
            <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
          </div>
        ) : (
          <div>
            
            {/* PROFILES VETTING QUEUE */}
            {activeTab === 'profiles' && (
              <div className="space-y-6">
                {pendingProfiles.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-900 p-8 text-center bg-zinc-900/10">
                    <p className="text-xs text-zinc-500">All user profiles are currently vetted and approved.</p>
                  </div>
                ) : (
                  pendingProfiles.map((p) => (
                    <div key={p.id} className="rounded-3xl border border-zinc-900 bg-zinc-900/20 p-6 space-y-6">
                      
                      {/* User metadata header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-4">
                        <div>
                          <h3 className="text-base font-bold text-white">{p.full_name}</h3>
                          <p className="text-xs text-rose-400 font-medium">{p.email} • {p.phone_number}</p>
                          <p className="text-[10px] text-zinc-500">Country: {p.country}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApproveProfile(p.id)}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition-colors"
                          >
                            Approve Profile
                          </button>
                          <button
                            onClick={() => handleRejectProfile(p.id)}
                            className="rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500 hover:text-white px-4 py-2 text-xs font-bold text-rose-400 transition-all"
                          >
                            Flag / Reject
                          </button>
                        </div>
                      </div>

                      {/* Detail specifications */}
                      <div className="grid gap-4 sm:grid-cols-2 text-xs">
                        <div className="space-y-2">
                          <h4 className="font-bold text-zinc-400">Identity Details</h4>
                          <div className="grid grid-cols-2 gap-2 text-zinc-300">
                            <span>Gender: {p.gender}</span>
                            <span>Height: {p.height} ft</span>
                            <span>Body Shape: {p.body_shape || 'N/A'}</span>
                            <span>Skin Tone: {p.skin_tone || 'N/A'}</span>
                            <span>Eye Color: {p.eye_color || 'N/A'}</span>
                          </div>
                        </div>

                        {p.about_me && (
                          <div className="space-y-1">
                            <h4 className="font-bold text-zinc-400">About Me Statement</h4>
                            <p className="text-zinc-300 font-light leading-relaxed">"{p.about_me}"</p>
                          </div>
                        )}
                      </div>

                      {/* User uploaded gallery */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-zinc-400">Uploaded Gallery ({p.gallery?.length || 0} / 6)</h4>
                        <div className="grid gap-2 grid-cols-3 sm:grid-cols-6">
                          {p.gallery?.map((url, index) => (
                            <a 
                              key={index}
                              href={url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="relative aspect-square rounded-xl overflow-hidden border border-zinc-800 hover:scale-105 transition-transform"
                            >
                              <img src={url} alt={`Gallery ${index}`} className="h-full w-full object-cover" />
                              <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[8px] text-zinc-300">
                                #{index + 1}
                              </span>
                            </a>
                          ))}
                        </div>
                      </div>

                    </div>
                  ))
                )}
              </div>
            )}

            {/* REVIEWS QUEUE */}
            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {reviews.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-900 p-8 text-center bg-zinc-900/10">
                    <p className="text-xs text-zinc-500">No review submissions found in database.</p>
                  </div>
                ) : (
                  reviews.map((r) => (
                    <div key={r.id} className="flex items-center justify-between rounded-2xl bg-zinc-900/20 border border-zinc-900 p-4">
                      <div className="space-y-1 text-left">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-white">{r.full_name}</span>
                          <span className="text-[10px] text-zinc-500">{r.email}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[8px] font-bold ${r.is_approved ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-amber-500/15 text-amber-400 border border-amber-500/20'}`}>
                            {r.is_approved ? 'Approved' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 leading-normal font-light">"{r.message}"</p>
                        <div className="flex gap-0.5 text-rose-500 pt-1">
                          {[...Array(5)].map((_, i) => (
                            <User key={i} className={`h-3 w-3 ${i < r.rating ? 'fill-rose-500 text-rose-500' : 'text-zinc-700'}`} />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!r.is_approved && (
                          <button
                            onClick={() => handleApproveReview(r.id)}
                            className="rounded-lg bg-emerald-500 hover:bg-emerald-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteReview(r.id)}
                          className="rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-850 p-2 text-rose-400 hover:text-rose-300 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* PAYMENTS & CRYPTO QUEUE */}
            {activeTab === 'payments' && (
              <div className="space-y-4">
                {payments.length === 0 ? (
                  <div className="rounded-3xl border border-zinc-900 p-8 text-center bg-zinc-900/10">
                    <p className="text-xs text-zinc-500">No payment records found.</p>
                  </div>
                ) : (
                  payments.map((p) => (
                    <div key={p.id} className="rounded-2xl bg-zinc-900/20 border border-zinc-900 p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-900/80 pb-3">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{p.full_name}</span>
                            <span className="text-xs text-zinc-400">({p.email})</span>
                            <span className="text-[10px] text-zinc-500">• {p.country}</span>
                          </div>
                          <span className="text-[10px] text-zinc-500 block">
                            Date: {new Date(p.created_at).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                            p.status === 'completed'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                              : p.status === 'pending'
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                          }`}>
                            {p.status}
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 text-xs">
                        <div>
                          <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Package</span>
                          <span className="font-bold text-white capitalize">{p.package_type.replace('_', ' ')}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500 uppercase font-semibold">Amount & Gateway</span>
                          <span className="font-bold text-white">
                            {p.currency} {p.amount} <span className="font-mono text-zinc-400">({p.provider.toUpperCase()})</span>
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-500 uppercase font-semibold">TxID / Reference</span>
                          <span className="font-mono text-[11px] text-zinc-300 break-all select-all">
                            {p.provider_transaction_id || 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Pending Matching Actions */}
                      {p.status === 'pending' && (
                        <div className="pt-2 flex items-center justify-end gap-2 border-t border-zinc-900/60">
                          <button
                            onClick={() => handleRejectPayment(p.id)}
                            className="rounded-xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500 hover:text-white px-3.5 py-1.5 text-xs font-semibold text-rose-400 transition-colors"
                          >
                            Reject Payment
                          </button>
                          <button
                            onClick={() => handleApprovePayment(p.id)}
                            className="rounded-xl bg-emerald-500 hover:bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white transition-colors flex items-center gap-1 shadow-sm"
                          >
                            <Check className="h-3.5 w-3.5" /> Verify & Credit User
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

          </div>
        )}

      </main>
    </div>
  );
}
