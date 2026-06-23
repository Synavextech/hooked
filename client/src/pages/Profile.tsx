import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Camera, Save, ArrowLeft, RefreshCw, UploadCloud, Trash2, X } from 'lucide-react';
import { Link } from 'wouter';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  
  // Physical details
  const [profileData, setProfileData] = useState({
    gender: '',
    height: '',
    skin_tone: '',
    eye_color: '',
    body_shape: '',
    about_me: '',
  });

  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ status: 'success' | 'error', text: string } | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.profiles) {
      const isPending = user.profiles.approval_status === 'pending';
      setProfileData({
        gender: (isPending ? user.profiles.pending_gender : user.profiles.gender) || '',
        height: (isPending ? user.profiles.pending_height : user.profiles.height) || '',
        skin_tone: (isPending ? user.profiles.pending_skin_tone : user.profiles.skin_tone) || '',
        eye_color: (isPending ? user.profiles.pending_eye_color : user.profiles.eye_color) || '',
        body_shape: (isPending ? user.profiles.pending_body_shape : user.profiles.body_shape) || '',
        about_me: (isPending ? user.profiles.pending_about_me : user.profiles.about_me) || '',
      });
      setImages((isPending ? user.profiles.pending_images : user.profiles.images) || []);
    }
  }, [user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setMsg(null);

    // Convert file to base64
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const res = await api.post('/users/profile/upload', {
          base64Image: reader.result,
          fileName: file.name
        });

        const newImages = [...images, res.data.publicUrl];
        setImages(newImages);
        
        // Auto-save the profile images array
        await api.put('/users/profile', {
          ...profileData,
          images: newImages
        });
        
        refreshUser();
        setMsg({ status: 'success', text: 'Image uploaded and synced successfully!' });
      } catch (err: any) {
        setMsg({ status: 'error', text: err.response?.data?.error || 'Image upload failed' });
      } finally {
        setUploading(false);
      }
    };
  };

  const handleRemoveImage = async (indexToRemove: number) => {
    try {
      const newImages = images.filter((_, idx) => idx !== indexToRemove);
      setImages(newImages);
      
      await api.put('/users/profile', {
        ...profileData,
        images: newImages
      });
      
      refreshUser();
      setMsg({ status: 'success', text: 'Image removed successfully!' });
    } catch (err) {
      setMsg({ status: 'error', text: 'Failed to remove image' });
    }
  };

  const handleSetProfilePicture = async (index: number) => {
    try {
      const selectedImage = images[index];
      const newImages = [selectedImage, ...images.filter((_, idx) => idx !== index)];
      setImages(newImages);
      
      await api.put('/users/profile', {
        ...profileData,
        images: newImages
      });
      
      refreshUser();
      setMsg({ status: 'success', text: 'Profile picture updated successfully!' });
    } catch (err) {
      setMsg({ status: 'error', text: 'Failed to update profile picture' });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);

    try {
      await api.put('/users/profile', {
        ...profileData,
        images
      });
      await refreshUser();
      setMsg({ status: 'success', text: 'Profile characteristics saved successfully!' });
    } catch (err: any) {
      setMsg({ status: 'error', text: err.response?.data?.error || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070408] text-white pl-0 md:pl-20 pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        
        {/* Back Link */}
        <div className="mb-6">
          <Link href="/">
            <a className="inline-flex items-center gap-2 text-zinc-400 hover:text-pink-500 text-xs transition-colors duration-200">
              <ArrowLeft className="w-4 h-4" /> Discover Feed
            </a>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Left Area: Display core settings */}
          <div className="bg-[#120b12]/50 border border-pink-500/10 p-6 rounded-3xl backdrop-blur-sm h-fit">
            <div className="flex flex-col items-center text-center">
              <div className="relative w-28 h-28 bg-zinc-900 rounded-full overflow-hidden border-2 border-pink-500/30 mb-4 shadow-xl">
                {images[0] ? (
                  <img src={images[0]} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-3xl font-bold uppercase">
                    {user?.names?.[0]}
                  </div>
                )}
              </div>
              <h3 className="text-xl font-bold truncate max-w-full">{user?.names}</h3>
              <p className="text-pink-400 text-xs mt-1 font-semibold">{user?.interaction_preference?.replace('_', ' ')}</p>
              <p className="text-zinc-500 text-[11px] mt-0.5">{user?.email}</p>
            </div>

            <div className="mt-8 space-y-4 border-t border-white/5 pt-6 text-xs">
              <div>
                <span className="text-zinc-500 block uppercase tracking-wider text-[10px]">Phone Number</span>
                <span className="text-zinc-300 font-medium">{user?.phone_number || 'Not Provided'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block uppercase tracking-wider text-[10px]">Country</span>
                <span className="text-zinc-300 font-medium">{user?.country || 'Not Provided'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block uppercase tracking-wider text-[10px]">VIP Premium Badge</span>
                <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  user?.is_premium ? 'bg-pink-500/20 text-pink-400 border border-pink-500/30' : 'bg-zinc-800 text-zinc-500'
                }`}>
                  {user?.is_premium ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Area: Form details + Image Gallery */}
          <div className="md:col-span-2 space-y-8">
            
            {user?.profiles?.approval_status && user.profiles.approval_status !== 'none' && (
              <div className={`p-4 rounded-xl text-xs font-semibold border ${
                user.profiles.approval_status === 'pending'
                  ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  : user.profiles.approval_status === 'approved'
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                <div className="flex items-start gap-2.5">
                  <span className="text-base mt-0.5">
                    {user.profiles.approval_status === 'pending' ? '⏳' : user.profiles.approval_status === 'approved' ? '✅' : '❌'}
                  </span>
                  <div>
                    <p className="font-bold">
                      Profile Status: {user.profiles.approval_status === 'pending' ? 'Pending Approval' : user.profiles.approval_status === 'approved' ? 'Live & Approved' : 'Changes Rejected'}
                    </p>
                    <p className="text-[10px] opacity-80 mt-0.5">
                      {user.profiles.approval_status === 'pending' 
                        ? 'Your profile edits have been submitted and are awaiting review by an administrator. They will go live once approved.' 
                        : user.profiles.approval_status === 'approved'
                        ? 'Your physical characteristics and showcase images are approved and visible to connections.'
                        : 'Your recent profile edit request was declined. Please verify your details and upload at least 6 high-quality photos before saving.'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {msg && (
              <div className={`p-4 rounded-xl text-xs font-semibold border ${
                msg.status === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}>
                {msg.text}
              </div>
            )}

            {/* Form */}
            <div className="bg-[#120b12]/50 border border-pink-500/10 p-6 md:p-8 rounded-3xl backdrop-blur-sm">
              <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                <Camera className="w-5 h-5 text-pink-500" />
                Physical Characteristics
              </h2>
              <form onSubmit={handleSaveProfile} className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Gender</label>
                  <select
                    name="gender"
                    value={profileData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white"
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-binary">Non-binary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Height</label>
                  <input
                    type="text"
                    name="height"
                    placeholder="e.g. 5ft 9in or 175cm"
                    value={profileData.height}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Skin Tone</label>
                  <input
                    type="text"
                    name="skin_tone"
                    placeholder="e.g. Light, Olive, Dark"
                    value={profileData.skin_tone}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Eye Color</label>
                  <input
                    type="text"
                    name="eye_color"
                    placeholder="e.g. Brown, Blue, Green"
                    value={profileData.eye_color}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">Body Shape</label>
                  <input
                    type="text"
                    name="body_shape"
                    placeholder="e.g. Athletic, Slim, Curvy, Average"
                    value={profileData.body_shape}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">About Me</label>
                  <textarea
                    name="about_me"
                    placeholder="Tell other users a bit about yourself, your hobbies, interests, or what you are looking for..."
                    value={profileData.about_me}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl focus:border-pink-500/50 outline-none text-xs text-white resize-none"
                  />
                </div>

                <div className="sm:col-span-2 mt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-pink-500/20 text-xs flex items-center justify-center gap-2"
                  >
                    {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {saving ? 'Saving Profile...' : 'Save Profile Specs'}
                  </button>
                </div>
              </form>
            </div>

            {/* Images Grid (Min 6 details) */}
            <div className="bg-[#120b12]/50 border border-pink-500/10 p-6 md:p-8 rounded-3xl backdrop-blur-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-pink-500" />
                    Profile Showcase Gallery
                  </h2>
                  <p className="text-[10px] text-zinc-500 mt-1">Please upload at least 6 high-quality images to complete your identity reveal profile.</p>
                </div>
                <div className="text-xs font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-3 py-1 rounded-full shrink-0">
                  {images.length} / 6
                </div>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 group shadow-lg cursor-pointer">
                    <img 
                      src={img} 
                      alt={`Showcase ${idx}`} 
                      className="w-full h-full object-cover transition-transform duration-300 hover:scale-105" 
                      onClick={() => setPreviewImage(img)}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(idx);
                      }}
                      className="absolute top-2.5 right-2.5 bg-black/70 hover:bg-rose-600 text-white p-2 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-md z-10"
                      title="Delete image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {idx === 0 ? (
                      <span className="absolute bottom-2.5 left-2.5 bg-pink-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-md uppercase tracking-wider z-10">
                        Profile Picture
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetProfilePicture(idx);
                        }}
                        className="absolute bottom-2.5 left-2.5 bg-black/75 hover:bg-pink-500 text-white text-[9px] font-bold px-2 py-1 rounded-md transition-all opacity-0 group-hover:opacity-100 shadow-md uppercase tracking-wider z-10"
                      >
                        Set Profile Pic
                      </button>
                    )}
                  </div>
                ))}

                {/* Upload Button */}
                <label className="relative aspect-square border-2 border-dashed border-zinc-800 hover:border-pink-500/40 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group hover:bg-pink-500/5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  {uploading ? (
                    <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-zinc-600 group-hover:text-pink-500 transition-colors" />
                      <span className="text-[10px] text-zinc-500 group-hover:text-pink-400 transition-colors font-semibold mt-2.5 uppercase tracking-wider">
                        Upload Photo
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>

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

export default Profile;
