import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth, usePWA } from '../App';
import Navigation from '../components/Navigation';
import { 
  Heart, Shield, AlertTriangle, User as UserIcon, LifeBuoy, 
  Sparkles, Image as ImageIcon, Trash2, Save, ArrowRight, AlertCircle, Plus,
  Globe, Lock, Eye, Check, CheckCircle2, Download, Smartphone
} from 'lucide-react';
import axios from 'axios';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const { isInstalled, promptInstall } = usePWA();
  const [location, setLocation] = useLocation();

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'rules' | 'basics' | 'habits' | 'gallery' | 'danger'>('rules');

  // Form State
  const [gender, setGender] = useState('woman');
  const [sexuality, setSexuality] = useState('straight');
  const [height, setHeight] = useState('5.6');
  const [skinTone, setSkinTone] = useState('');
  const [eyeColor, setEyeColor] = useState('');
  const [bodyShape, setBodyShape] = useState('');
  const [lookingFor, setLookingFor] = useState('Long term partner');
  
  const [drinking, setDrinking] = useState('Not for me');
  const [smoking, setSmoking] = useState('Non-smoker');
  const [workout, setWorkout] = useState('sometimes');
  const [pets, setPets] = useState('cat');
  
  const [communicationStyle, setCommunicationStyle] = useState('better in person');
  const [loveLanguage, setLoveLanguage] = useState('time together');
  const [educationLevel, setEducationLevel] = useState('bachelor');
  const [zodiac, setZodiac] = useState('Gemini');
  const [birthDate, setBirthDate] = useState('');
  const [showAge, setShowAge] = useState(true);
  const [aboutMe, setAboutMe] = useState('');

  // Gallery: Public vs Profile Private
  const [gallery, setGallery] = useState<string[]>([]);
  const [privateGallery, setPrivateGallery] = useState<string[]>([]);
  const [uploadPrivacy, setUploadPrivacy] = useState<'public' | 'private'>('public');
  const [newImageUrl, setNewImageUrl] = useState('');

  // UI Status
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Fetch current user profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await axios.get('/api/users/profile');
        const p = res.data?.profile;
        if (p) {
          setGender(p.gender || 'woman');
          setSexuality(p.sexuality || 'straight');
          setHeight(p.height || '5.6');
          setSkinTone(p.skin_tone || '');
          setEyeColor(p.eye_color || '');
          setBodyShape(p.body_shape || '');
          setLookingFor(p.looking_for || 'Long term partner');
          setDrinking(p.drinking || 'Not for me');
          setSmoking(p.smoking || 'Non-smoker');
          setWorkout(p.workout || 'sometimes');
          setPets(p.pets || 'cat');
          setCommunicationStyle(p.communication_style || 'better in person');
          setLoveLanguage(p.love_language || 'time together');
          setEducationLevel(p.education_level || 'bachelor');
          setZodiac(p.zodiac || 'Gemini');
          setBirthDate(p.birth_date ? p.birth_date.split('T')[0] : '');
          setShowAge(p.show_age !== false);
          setAboutMe(p.about_me || '');
          setGallery(p.gallery || []);
          setPrivateGallery(p.private_gallery || []);
        }
      } catch (err) {
        console.error('Failed to load profile:', err);
      }
    };
    fetchProfile();
  }, []);

  // Save changes handler
  const handleSave = async () => {
    setStatusMsg(null);
    setErrorMsg(null);

    const totalPhotos = gallery.length + privateGallery.length;
    if (totalPhotos < 6) {
      setErrorMsg('You must upload at least 6 total photos across your public and private gallery.');
      setActiveTab('gallery');
      return;
    }

    try {
      const res = await axios.post('/api/users/profile', {
        gender, height, skin_tone: skinTone, eye_color: eyeColor, body_shape: bodyShape, sexuality,
        gallery, private_gallery: privateGallery, looking_for: lookingFor, drinking, smoking, workout, pets,
        communication_style: communicationStyle, love_language: loveLanguage, education_level: educationLevel, zodiac,
        birth_date: birthDate || null, show_age: showAge, about_me: aboutMe
      });
      
      setStatusMsg(res.data.message || 'Profile saved successfully.');
      await refreshUser(); // updates user.is_approved / flags
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to save profile.');
    }
  };

  // Image Upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMsg(null);

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await axios.post('/api/users/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data?.url) {
        if (uploadPrivacy === 'public') {
          setGallery(prev => [...prev, res.data.url]);
        } else {
          setPrivateGallery(prev => [...prev, res.data.url]);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Image upload failed.');
    } finally {
      setIsUploading(false);
    }
  };

  // Add URL image directly
  const addUrlImage = () => {
    if (!newImageUrl.trim()) return;
    if (uploadPrivacy === 'public') {
      setGallery(prev => [...prev, newImageUrl.trim()]);
    } else {
      setPrivateGallery(prev => [...prev, newImageUrl.trim()]);
    }
    setNewImageUrl('');
  };

  // Move photo between Public and Private
  const moveToPrivate = (url: string) => {
    setGallery(prev => prev.filter(u => u !== url));
    setPrivateGallery(prev => [...prev, url]);
  };

  const moveToPublic = (url: string) => {
    setPrivateGallery(prev => prev.filter(u => u !== url));
    setGallery(prev => [...prev, url]);
  };

  // Remove photo from galleries
  const removePublicPhoto = (index: number) => {
    setGallery(prev => prev.filter((_, i) => i !== index));
  };

  const removePrivatePhoto = (index: number) => {
    setPrivateGallery(prev => prev.filter((_, i) => i !== index));
  };

  // Delete My Account
  const handleDeleteAccount = async () => {
    if (!confirm('Are you absolutely sure you want to delete your account? This action is permanent and erases your entire registration, profile, connections, and message history.')) {
      return;
    }
    try {
      await axios.delete('/api/users/delete-account');
      await refreshUser();
      setLocation('/');
    } catch (err) {
      alert('Failed to delete account.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-28">
      <Navigation />

      <main className="mx-auto max-w-2xl px-4 py-8">
        
        {/* Verification Alert Banner */}
        {user && !user.is_approved && (
          <div className="mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs leading-normal">
              <span className="font-bold text-amber-400">Account Awaiting Verification: </span>
              Your profile is currently waiting for admin approval. Please complete your profile details and upload at least 6 images, then text support using the WhatsApp button on the landing page to request verification.
            </div>
          </div>
        )}

        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <div>
              <h1 className="text-2xl font-black text-white">Profile Portal</h1>
              <p className="text-xs text-zinc-500 font-light">Set up and control your public details.</p>
            </div>
            <button 
              onClick={() => setLocation('/dashboard')} 
              className="text-xs font-semibold text-rose-500 hover:underline"
            >
              Skip & Go to Dashboard
            </button>
          </div>

          {/* Tab Selector */}
          <div className="flex overflow-x-auto rounded-xl bg-zinc-950 p-1 border border-zinc-900 gap-1">
            <button
              onClick={() => setActiveTab('rules')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === 'rules' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Rules
            </button>
            <button
              onClick={() => setActiveTab('basics')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === 'basics' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Identity & Basics
            </button>
            <button
              onClick={() => setActiveTab('habits')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === 'habits' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Lifestyle
            </button>
            <button
              onClick={() => setActiveTab('gallery')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold transition-all ${activeTab === 'gallery' ? 'bg-rose-500 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Gallery ({gallery.length + privateGallery.length})
            </button>
            <button
              onClick={() => setActiveTab('danger')}
              className={`whitespace-nowrap rounded-lg px-4 py-2 text-xs font-semibold text-rose-400 transition-all ${activeTab === 'danger' ? 'bg-rose-950 text-rose-300' : 'hover:text-rose-300'}`}
            >
              Settings
            </button>
          </div>

          {/* TAB CONTENT: RULES */}
          {activeTab === 'rules' && (
            <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-6">
              <div className="text-center space-y-2">
                <Heart className="mx-auto h-8 w-8 text-rose-500" />
                <h2 className="text-lg font-bold text-white">Welcome to Hooked.ink</h2>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">Please read and abide by our core policies to help us match you better.</p>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="rounded-full bg-rose-500/10 p-2 text-rose-500 h-9 w-9 shrink-0 flex items-center justify-center font-bold">1</div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Be Yourself</h3>
                    <p className="text-[11px] text-zinc-400 font-light mt-0.5">Make sure your media, user details, and bio present who you are to avoid confusion. Communicate truthfully.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-full bg-rose-500/10 p-2 text-rose-500 h-9 w-9 shrink-0 flex items-center justify-center font-bold">2</div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Stay Safe</h3>
                    <p className="text-[11px] text-zinc-400 font-light mt-0.5">Don't be too quick to give out personal details. For first-time meetups, select public places equipped with CCTV.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-full bg-rose-500/10 p-2 text-rose-500 h-9 w-9 shrink-0 flex items-center justify-center font-bold">3</div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Play it Cool</h3>
                    <p className="text-[11px] text-zinc-400 font-light mt-0.5">Respect others and treat them with the courtesy you would want to receive.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="rounded-full bg-rose-500/10 p-2 text-rose-500 h-9 w-9 shrink-0 flex items-center justify-center font-bold">4</div>
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Be Pro-active</h3>
                    <p className="text-[11px] text-zinc-400 font-light mt-0.5">Report abusive behavior or fake profiles to safeguard our entire community.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('basics')}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                Continue to Identity Setup <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* TAB CONTENT: BASICS */}
          {activeTab === 'basics' && (
            <div className="space-y-4">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Gender</label>
                  <select 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="woman">Woman</option>
                    <option value="man">Man</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Sexuality</label>
                  <select 
                    value={sexuality} 
                    onChange={(e) => setSexuality(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="straight">Straight</option>
                    <option value="bisexual">Bisexual</option>
                    <option value="gay">Gay</option>
                    <option value="rather not say">Rather not say</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Height (ft)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Body Shape</label>
                  <input
                    type="text"
                    value={bodyShape}
                    onChange={(e) => setBodyShape(e.target.value)}
                    placeholder="e.g. Athletic, Hourglass, Slim"
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Skin Tone</label>
                  <input
                    type="text"
                    value={skinTone}
                    onChange={(e) => setSkinTone(e.target.value)}
                    placeholder="e.g. Light, Olive, Dark"
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Eye Color</label>
                  <input
                    type="text"
                    value={eyeColor}
                    onChange={(e) => setEyeColor(e.target.value)}
                    placeholder="e.g. Brown, Blue, Green"
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Zodiac Sign</label>
                  <select 
                    value={zodiac} 
                    onChange={(e) => setZodiac(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    {['Capricorn', 'Aquarius', 'Pisces', 'Aries', 'Taurus', 'Gemini', 'cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius'].map(z => (
                      <option key={z} value={z}>{z}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Birth Date</label>
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">I am looking for</label>
                <select 
                  value={lookingFor} 
                  onChange={(e) => setLookingFor(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="Long term partner">Long term partner</option>
                  <option value="Long term open to short term">Long term open to short term</option>
                  <option value="short term open to long">short term open to long</option>
                  <option value="short term fun">short term fun</option>
                  <option value="new friend">new friend</option>
                  <option value="still figuring out">still figuring out</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">About Me</label>
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  placeholder="Write a brief summary to boost your profile..."
                  rows={4}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-850 p-3 text-xs text-white focus:outline-none"
                ></textarea>
              </div>

              <div className="flex items-center gap-2.5 py-2">
                <input
                  type="checkbox"
                  id="showAge"
                  checked={showAge}
                  onChange={(e) => setShowAge(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-800 bg-zinc-900 text-rose-500"
                />
                <label htmlFor="showAge" className="text-xs text-zinc-400">Show age in my profile</label>
              </div>

              <button
                onClick={() => setActiveTab('habits')}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                Proceed to Lifestyle <ArrowRight className="h-4 w-4" />
              </button>

            </div>
          )}

          {/* TAB CONTENT: LIFESTYLE */}
          {activeTab === 'habits' && (
            <div className="space-y-4">
              
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Drinking Habits</label>
                  <select 
                    value={drinking} 
                    onChange={(e) => setDrinking(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Not for me">Not for me</option>
                    <option value="sober">Sober</option>
                    <option value="sober curious">Sober curious</option>
                    <option value="on special occasion">On special occasion</option>
                    <option value="socially on weekends">Socially on weekends</option>
                    <option value="most nights">Most nights</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Smoking Habits</label>
                  <select 
                    value={smoking} 
                    onChange={(e) => setSmoking(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="Non-smoker">Non-smoker</option>
                    <option value="social smoker">Social smoker</option>
                    <option value="smoker when drinking">Smoker when drinking</option>
                    <option value="smoker">Smoker</option>
                    <option value="trying to quit">Trying to quit</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Workout Routine</label>
                  <select 
                    value={workout} 
                    onChange={(e) => setWorkout(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="everyday">Everyday</option>
                    <option value="often">Often</option>
                    <option value="sometimes">Sometimes</option>
                    <option value="never">Never</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Pets</label>
                  <select 
                    value={pets} 
                    onChange={(e) => setPets(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="cat">Cat</option>
                    <option value="dog">Dog</option>
                    <option value="reptile">Reptile</option>
                    <option value="don't have but love">Don't have but love</option>
                    <option value="other">Other</option>
                    <option value="allergic to pet">Allergic to pet</option>
                    <option value="want a pet">Want a pet</option>
                    <option value="pet free">Pet free</option>
                    <option value="bird">Bird</option>
                    <option value="all pets">All pets</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Communication Style</label>
                  <select 
                    value={communicationStyle} 
                    onChange={(e) => setCommunicationStyle(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="big time texter">Big time texter</option>
                    <option value="phone caller">Phone caller</option>
                    <option value="video chatter">Video chatter</option>
                    <option value="bad texter">Bad texter</option>
                    <option value="better in person">Better in person</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Love Language</label>
                  <select 
                    value={loveLanguage} 
                    onChange={(e) => setLoveLanguage(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                  >
                    <option value="thoughtful gesture">Thoughtful gesture</option>
                    <option value="presents">Presents</option>
                    <option value="touch">Touch</option>
                    <option value="compliment">Compliment</option>
                    <option value="time together">Time together</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Education Level</label>
                <select 
                  value={educationLevel} 
                  onChange={(e) => setEducationLevel(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-850 px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  <option value="bachelor">Bachelor</option>
                  <option value="in college">In College</option>
                  <option value="high school">High School</option>
                  <option value="phd">PhD</option>
                  <option value="in grad schol">In Grad School</option>
                  <option value="masters">Masters</option>
                  <option value="trade school">Trade School</option>
                </select>
              </div>

              <button
                onClick={() => setActiveTab('gallery')}
                className="w-full rounded-xl bg-zinc-900 border border-zinc-800 py-3 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                Proceed to Gallery <ArrowRight className="h-4 w-4" />
              </button>

            </div>
          )}

          {/* TAB CONTENT: GALLERY */}
          {activeTab === 'gallery' && (
            <div className="space-y-6 text-left">
              
              {/* Guidance Banner */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Photo Privacy Management ({gallery.length + privateGallery.length} / 6 Minimum Required)
                  </h3>
                  <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    gallery.length + privateGallery.length >= 6
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {gallery.length + privateGallery.length >= 6 ? 'Requirement Met' : `${6 - (gallery.length + privateGallery.length)} more required`}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400 font-light leading-relaxed">
                  Control which images are public to any user vs. which are private and locked until you connect:
                </p>
                <div className="grid gap-2 sm:grid-cols-2 pt-1 text-[11px]">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 flex items-start gap-2">
                    <Globe className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Image - Public</span>
                      <span className="text-[10px] text-zinc-400 font-light">Can be seen by anyone in the system (including non-subscribers).</span>
                    </div>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-2.5 flex items-start gap-2">
                    <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-white block">Image - Profile Private</span>
                      <span className="text-[10px] text-zinc-400 font-light">Can only be seen by users you have hooked with (accepted connections).</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Privacy Selector & File Chooser */}
              <div className="rounded-2xl border border-zinc-900 bg-zinc-950 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Image Privacy on Upload
                  </span>
                  <div className="flex rounded-lg bg-zinc-900 p-0.5 border border-zinc-800">
                    <button
                      type="button"
                      onClick={() => setUploadPrivacy('public')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                        uploadPrivacy === 'public'
                          ? 'bg-rose-500 text-white'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Globe className="h-3 w-3" /> Public
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadPrivacy('private')}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                        uploadPrivacy === 'private'
                          ? 'bg-amber-500 text-black'
                          : 'text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      <Lock className="h-3 w-3" /> Profile Private
                    </button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="flex-1 rounded-xl border border-dashed border-zinc-800 hover:border-rose-500/50 p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors bg-zinc-900/30">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="sr-only" 
                    />
                    {isUploading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-rose-500 border-t-transparent"></div>
                    ) : (
                      <>
                        <Plus className="h-4 w-4 text-zinc-400" />
                        <span className="text-xs text-zinc-300 font-medium">
                          Upload to {uploadPrivacy === 'public' ? 'Public Gallery' : 'Profile Private Gallery'}
                        </span>
                      </>
                    )}
                  </label>

                  <div className="flex gap-2 rounded-xl bg-zinc-900 px-3 py-1.5 border border-zinc-800 sm:w-1/2">
                    <input
                      type="text"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Or paste image URL directly..."
                      className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addUrlImage}
                      className="rounded-lg bg-zinc-800 hover:bg-zinc-700 px-2.5 py-1 text-[10px] font-semibold text-zinc-200 transition-colors"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* 1. PUBLIC GALLERY GRID */}
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Globe className="h-4 w-4 text-rose-500" />
                    <span>Public Images ({gallery.length})</span>
                    <span className="text-[10px] text-zinc-500 font-light">• Visible to anyone</span>
                  </div>
                </div>

                {gallery.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-900 p-6 text-center text-xs text-zinc-500 bg-zinc-950">
                    No public images uploaded. (Public images are visible on your profile card).
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                    {gallery.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-zinc-800 group bg-zinc-900">
                        <img src={url} alt={`Public ${i}`} className="h-full w-full object-cover" />
                        
                        {/* Action buttons */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            title="Make Profile Private (Hooked only)"
                            onClick={() => moveToPrivate(url)}
                            className="rounded-full bg-black/70 p-1.5 text-amber-400 hover:bg-black transition-colors"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            type="button"
                            title="Delete Photo"
                            onClick={() => removePublicPhoto(i)}
                            className="rounded-full bg-black/70 p-1.5 text-rose-400 hover:bg-black transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[9px] text-white flex items-center gap-1">
                          <Globe className="h-2.5 w-2.5 text-rose-400" /> Public #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. PROFILE PRIVATE GALLERY GRID */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                    <Lock className="h-4 w-4 text-amber-400" />
                    <span>Profile Private Images ({privateGallery.length})</span>
                    <span className="text-[10px] text-zinc-500 font-light">• Visible ONLY to accepted connections (Hooked)</span>
                  </div>
                </div>

                {privateGallery.length === 0 ? (
                  <div className="rounded-2xl border border-zinc-900 p-6 text-center text-xs text-zinc-500 bg-zinc-950">
                    No private images uploaded yet. You can keep exclusive pictures private for those you hook with.
                  </div>
                ) : (
                  <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                    {privateGallery.map((url, i) => (
                      <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-amber-500/20 group bg-zinc-900">
                        <img src={url} alt={`Private ${i}`} className="h-full w-full object-cover" />
                        
                        {/* Action buttons */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            title="Make Public (Visible to all)"
                            onClick={() => moveToPublic(url)}
                            className="rounded-full bg-black/70 p-1.5 text-rose-400 hover:bg-black transition-colors"
                          >
                            <Globe className="h-3.5 w-3.5" />
                          </button>
                          <button 
                            type="button"
                            title="Delete Photo"
                            onClick={() => removePrivatePhoto(i)}
                            className="rounded-full bg-black/70 p-1.5 text-rose-400 hover:bg-black transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <span className="absolute bottom-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[9px] text-amber-300 flex items-center gap-1 border border-amber-500/20">
                          <Lock className="h-2.5 w-2.5" /> Hooked Private #{i + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB CONTENT: DANGER ZONE & SETTINGS */}
          {activeTab === 'danger' && (
            <div className="space-y-6">
              
              {/* PWA App Experience Card */}
              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/30 p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-3 text-left">
                    <Smartphone className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-xs font-bold text-white">Hooked App Experience (PWA)</h3>
                      <p className="text-[11px] text-zinc-400 leading-relaxed font-light mt-0.5">
                        {isInstalled 
                          ? 'Hooked is installed as a native app on your device. Enjoy fast full-screen performance and real-time alerts.' 
                          : 'Install Hooked to your home screen or desktop for full-screen mode, instant offline launch, and direct connection notifications.'}
                      </p>
                    </div>
                  </div>
                  {isInstalled ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[11px] font-semibold text-emerald-400 shrink-0">
                      <Check className="h-3 w-3" /> Installed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={promptInstall}
                      className="rounded-xl bg-rose-500 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-600 transition-all shadow-md shadow-rose-500/20 shrink-0 flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" /> Install
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-zinc-900 bg-zinc-900/10 p-6 space-y-4">
                <div className="flex gap-3 text-left">
                  <Shield className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-white">General Account Policy</h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-light mt-0.5">
                      Your subscription details, wallet token purchases, and vetting status are logged securely. For account updates or refund claims, please coordinate directly with the WhatsApp helpline.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-rose-950/20 bg-rose-500/5 p-6 space-y-4">
                <div className="flex gap-3 text-left">
                  <Trash2 className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-xs font-bold text-white">Erase My Account & History</h3>
                    <p className="text-[11px] text-zinc-400 leading-relaxed font-light mt-0.5">
                      Clicking the button below will immediately trigger our anti-tracking routine. Your profile details, image gallery, match connections, chat logs, and notifications will be permanently deleted from our database.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className="w-full rounded-xl bg-rose-500/10 border border-rose-500/20 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500 hover:text-white transition-colors"
                >
                  Delete My Account Permanently
                </button>
              </div>

            </div>
          )}

          {/* Error and Status messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-400">
              <AlertCircle className="h-4.5 w-4.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {statusMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5 shrink-0" />
              <span>{statusMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          {activeTab !== 'rules' && (
            <div className="flex gap-3 border-t border-zinc-900 pt-6">
              <button
                onClick={handleSave}
                className="flex-1 rounded-xl bg-rose-500 py-3 text-xs font-semibold text-white hover:bg-rose-600 transition-colors flex items-center justify-center gap-1.5"
              >
                <Save className="h-4 w-4" /> Save Profile Details
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
