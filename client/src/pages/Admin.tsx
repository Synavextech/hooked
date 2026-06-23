import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Shield, Sparkles, Users, ToggleLeft, ToggleRight, Trash2, ArrowLeft, X, Star } from 'lucide-react';
import { Link, useLocation } from 'wouter';

interface AdminUserItem {
  id: string;
  names: string;
  email: string;
  phone_number?: string;
  country?: string;
  interaction_preference: string;
  role: 'admin' | 'user';
  is_premium: boolean;
  created_at: string;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, premium: 0, admins: 0 });
  const [activeTab, setActiveTab] = useState<'users' | 'approvals' | 'reviews'>('users');
  const [pendingProfiles, setPendingProfiles] = useState<any[]>([]);
  const [fetchingApprovals, setFetchingApprovals] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [fetchingReviews, setFetchingReviews] = useState(false);

  const fetchAdminData = async () => {
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);

      const total = res.data.length;
      const premium = res.data.filter((u: any) => u.is_premium).length;
      const admins = res.data.filter((u: any) => u.role === 'admin').length;
      setStats({ total, premium, admins });
    } catch (err) {
      console.error('Failed to load admin records', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingProfiles = async () => {
    setFetchingApprovals(true);
    try {
      const res = await api.get('/admin/pending-profiles');
      setPendingProfiles(res.data);
    } catch (err) {
      console.error('Failed to load pending profiles', err);
    } finally {
      setFetchingApprovals(false);
    }
  };

  const fetchReviews = async () => {
    setFetchingReviews(true);
    try {
      const res = await api.get('/admin/reviews');
      setReviews(res.data);
    } catch (err) {
      console.error('Failed to load reviews', err);
    } finally {
      setFetchingReviews(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      setLocation('/');
      return;
    }

    fetchAdminData();
    fetchPendingProfiles();
  }, [user, setLocation]);

  useEffect(() => {
    if (activeTab === 'approvals') {
      fetchPendingProfiles();
    } else if (activeTab === 'reviews') {
      fetchReviews();
    }
  }, [activeTab]);

  const handleTogglePremium = async (targetUserId: string, currentStatus: boolean) => {
    try {
      await api.put(`/admin/users/${targetUserId}/premium`, { is_premium: !currentStatus });
      setUsers(users.map(u => u.id === targetUserId ? { ...u, is_premium: !currentStatus } : u));
    } catch (err) {
      alert('Failed to modify premium status');
    }
  };

  const handleToggleAdmin = async (targetUserId: string, currentRole: 'admin' | 'user') => {
    try {
      const nextRole = currentRole === 'admin' ? 'user' : 'admin';
      await api.put(`/admin/users/${targetUserId}/role`, { role: nextRole });
      setUsers(users.map(u => u.id === targetUserId ? { ...u, role: nextRole } : u));
    } catch (err) {
      alert('Failed to modify user authorization');
    }
  };

  const handleDeleteUser = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user account? This cannot be undone.')) return;
    try {
      await api.delete(`/admin/users/${targetUserId}`);
      setUsers(users.filter(u => u.id !== targetUserId));
    } catch (err) {
      alert('Failed to delete user');
    }
  };

  const handleApproveProfile = async (targetUserId: string) => {
    try {
      await api.post(`/admin/profiles/${targetUserId}/approve`);
      setPendingProfiles(pendingProfiles.filter(p => p.user_id !== targetUserId));
      alert('Profile approved and updated successfully.');
    } catch (err) {
      alert('Failed to approve profile changes.');
    }
  };

  const handleRejectProfile = async (targetUserId: string) => {
    try {
      await api.post(`/admin/profiles/${targetUserId}/reject`);
      setPendingProfiles(pendingProfiles.filter(p => p.user_id !== targetUserId));
      alert('Profile changes rejected successfully.');
    } catch (err) {
      alert('Failed to reject profile changes.');
    }
  };

  const handleUpdateReviewStatus = async (reviewId: string, status: 'approved' | 'rejected') => {
    try {
      await api.put(`/admin/reviews/${reviewId}/status`, { status });
      setReviews(reviews.map(r => r.id === reviewId ? { ...r, status } : r));
      alert(`Review status updated to ${status}.`);
    } catch (err) {
      alert('Failed to update review status.');
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm('Are you sure you want to permanently delete this review?')) return;
    try {
      await api.delete(`/admin/reviews/${reviewId}`);
      setReviews(reviews.filter(r => r.id !== reviewId));
      alert('Review deleted successfully.');
    } catch (err) {
      alert('Failed to delete review.');
    }
  };

  if (!user || user.role !== 'admin') {
    return null; // Redirecting
  }

  return (
    <div className="min-h-screen bg-[#070408] text-white pl-0 md:pl-20 pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8">
        
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-zinc-400 hover:text-pink-500 text-xs transition-colors duration-200">
              <ArrowLeft className="w-4 h-4" /> Discover Feed
            </a>
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Shield className="w-8 h-8 text-pink-500 fill-pink-500/10" />
              Admin Portal
            </h1>
            <p className="text-zinc-500 text-sm font-light mt-1">Platform management, roles, and premium user status sync.</p>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="bg-[#120b12]/50 border border-pink-500/10 p-6 rounded-3xl backdrop-blur-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-bold">Total Accounts</span>
              <span className="text-3xl font-extrabold text-white">{stats.total}</span>
            </div>
          </div>

          <div className="bg-[#120b12]/50 border border-pink-500/10 p-6 rounded-3xl backdrop-blur-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-bold">VIP Premium Users</span>
              <span className="text-3xl font-extrabold text-white">{stats.premium}</span>
            </div>
          </div>

          <div className="bg-[#120b12]/50 border border-pink-500/10 p-6 rounded-3xl backdrop-blur-sm flex items-center gap-5">
            <div className="w-12 h-12 bg-pink-500/10 rounded-2xl flex items-center justify-center text-pink-500">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-zinc-500 block uppercase tracking-wider text-[10px] font-bold">Authorized Admins</span>
              <span className="text-3xl font-extrabold text-white">{stats.admins}</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2.5 mb-8 border-b border-white/5 pb-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            User Accounts
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all relative cursor-pointer ${
              activeTab === 'approvals'
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Profile Approvals
            {pendingProfiles.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-amber-500 text-black text-[9px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#070408]">
                {pendingProfiles.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reviews'
                ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            Manage Reviews
          </button>
        </div>

        {activeTab === 'users' ? (
          /* User Management List */
          <div className="bg-[#120b12]/50 border border-pink-500/10 rounded-3xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-lg font-bold">User Registrations</h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-light">Loading user base records...</div>
            ) : users.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-light">No user accounts found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-zinc-500 uppercase tracking-wider font-bold border-b border-white/5">
                      <th className="p-4">Names / Email</th>
                      <th className="p-4">Phone / Country</th>
                      <th className="p-4">Interaction</th>
                      <th className="p-4">VIP Premium</th>
                      <th className="p-4">System Role</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((item) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white text-sm">{item.names}</p>
                          <p className="text-zinc-500 text-[10px]">{item.email}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-zinc-300">{item.phone_number || 'N/A'}</p>
                          <p className="text-zinc-500 text-[10px]">{item.country || 'N/A'}</p>
                        </td>
                        <td className="p-4">
                          <span className="bg-pink-500/10 text-pink-400 border border-pink-500/20 px-2.5 py-1 rounded-full uppercase tracking-wider text-[9px] font-semibold">
                            {item.interaction_preference.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleTogglePremium(item.id, item.is_premium)}
                            className="flex items-center gap-1 text-zinc-400 hover:text-white transition-all cursor-pointer"
                            title="Toggle Premium Privilege"
                          >
                            {item.is_premium ? (
                              <ToggleRight className="w-7 h-7 text-pink-500" />
                            ) : (
                              <ToggleLeft className="w-7 h-7 text-zinc-600" />
                            )}
                          </button>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleToggleAdmin(item.id, item.role)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider transition-all border cursor-pointer ${
                              item.role === 'admin' 
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                            }`}
                          >
                            {item.role}
                          </button>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleDeleteUser(item.id)}
                            className="text-zinc-500 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-500/10 transition-all cursor-pointer"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : activeTab === 'approvals' ? (
          /* Profile Approvals Console */
          <div className="bg-[#120b12]/50 border border-pink-500/10 rounded-3xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-lg font-bold">Profile Update Requests</h2>
            </div>

            {fetchingApprovals ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-light">Loading pending profiles...</div>
            ) : pendingProfiles.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-light">No pending profile changes found.</div>
            ) : (
              <div className="grid grid-cols-1 gap-6 p-6">
                {pendingProfiles.map((prof) => (
                  <div key={prof.user_id} className="bg-black/30 border border-white/5 rounded-3xl p-6 flex flex-col xl:flex-row justify-between gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-sm font-bold text-white">{prof.user?.names}</h3>
                          <p className="text-zinc-500 text-[10px]">{prof.user?.email}</p>
                        </div>
                        <span className="bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                          Awaiting Review
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                          <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Gender</span>
                          <span className="font-bold text-zinc-200">{prof.pending_gender || 'Not set'}</span>
                        </div>
                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                          <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Height</span>
                          <span className="font-bold text-zinc-200">{prof.pending_height || 'Not set'}</span>
                        </div>
                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                          <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Skin Tone</span>
                          <span className="font-bold text-zinc-200">{prof.pending_skin_tone || 'Not set'}</span>
                        </div>
                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5">
                          <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Eye Color</span>
                          <span className="font-bold text-zinc-200">{prof.pending_eye_color || 'Not set'}</span>
                        </div>
                        <div className="bg-black/30 p-3 rounded-2xl border border-white/5 col-span-2 md:col-span-1">
                          <span className="text-[9px] text-zinc-500 block uppercase tracking-wider">Body Shape</span>
                          <span className="font-bold text-zinc-200">{prof.pending_body_shape || 'Not set'}</span>
                        </div>
                      </div>

                      {prof.pending_about_me && (
                        <div className="bg-[#1a0f1a] p-4 rounded-2xl border border-pink-500/20 col-span-2">
                          <span className="text-[10px] text-pink-400 block uppercase tracking-wider font-extrabold mb-1">Pending About Me</span>
                          <p className="text-zinc-200 text-xs leading-relaxed font-light whitespace-pre-line">{prof.pending_about_me}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-zinc-500 text-[9px] uppercase font-bold tracking-wider mb-2">Showcase Photos ({prof.pending_images?.length || 0})</p>
                        <div className="flex flex-wrap gap-2">
                          {prof.pending_images && prof.pending_images.map((img: string, idx: number) => (
                            <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-white/5 cursor-pointer">
                              <img 
                                src={img} 
                                alt="Showcase" 
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                                onClick={() => setPreviewImage(img)}
                              />
                            </div>
                          ))}
                          {(!prof.pending_images || prof.pending_images.length === 0) && (
                            <span className="text-zinc-600 text-xs italic">No photos uploaded</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex xl:flex-col justify-end gap-2.5 shrink-0 self-end xl:self-center">
                      <button
                        onClick={() => handleApproveProfile(prof.user_id)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-lg hover:shadow-emerald-500/10 cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleRejectProfile(prof.user_id)}
                        className="bg-zinc-800 hover:bg-rose-950/40 hover:text-rose-400 border border-zinc-700 hover:border-rose-900 text-zinc-300 font-extrabold px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Reviews Management Console */
          <div className="bg-[#120b12]/50 border border-pink-500/10 rounded-3xl overflow-hidden backdrop-blur-sm">
            <div className="p-6 border-b border-white/5">
              <h2 className="text-lg font-bold">Manage User Reviews</h2>
            </div>

            {fetchingReviews ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-light">Loading reviews...</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 text-sm font-light">No reviews found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-black/20 text-zinc-500 uppercase tracking-wider font-bold border-b border-white/5">
                      <th className="p-4">User</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4">Message</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {reviews.map((rev) => (
                      <tr key={rev.id} className="hover:bg-white/5 transition-colors">
                        <td className="p-4">
                          <p className="font-bold text-white text-sm">{rev.user?.names}</p>
                          <p className="text-zinc-500 text-[10px]">{rev.user?.email}</p>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-0.5 text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                className={`w-4.5 h-4.5 ${s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-700'}`}
                              />
                            ))}
                          </div>
                        </td>
                        <td className="p-4 max-w-xs">
                          <p className="text-zinc-300 font-light leading-relaxed whitespace-pre-line" title={rev.message}>
                            {rev.message}
                          </p>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider border ${
                            rev.status === 'approved'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : rev.status === 'rejected'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            {rev.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center items-center gap-2">
                            {rev.status !== 'approved' && (
                              <button
                                onClick={() => handleUpdateReviewStatus(rev.id, 'approved')}
                                className="bg-emerald-500/25 hover:bg-emerald-500 text-emerald-400 hover:text-black font-extrabold px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Approve
                              </button>
                            )}
                            {rev.status !== 'rejected' && (
                              <button
                                onClick={() => handleUpdateReviewStatus(rev.id, 'rejected')}
                                className="bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white font-extrabold px-3 py-1.5 rounded-lg text-[9px] uppercase tracking-wider transition-all cursor-pointer"
                              >
                                Reject
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteReview(rev.id)}
                              className="text-zinc-500 hover:text-rose-500 p-2 rounded-lg hover:bg-rose-500/10 transition-all cursor-pointer"
                              title="Delete Review"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

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

export default Admin;
