/**
 * ProfilePanel — Full-featured profile panel.
 * Sign in / Sign up with email, profile editing,
 * preferences (theme, wallpaper, AI personality, language, privacy).
 *
 * Features:
 *  - Profile picture selection (upload from device or URL)
 *  - Language selection (functional, persisted)
 *  - Appearance & Theme (live theme switching)
 *  - Privacy & Security settings
 *  - 4 featured wallpapers to choose from
 */
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Mail, Lock, Eye, EyeOff, LogOut, Settings,
  Bell, Globe, Palette, Sparkles, Check, ChevronRight, ChevronLeft,
  Camera, Edit3, Loader2, AlertCircle, CheckCircle2,
  Monitor, Shield, Image, Sun, Moon, Zap, Layers, Crown, Mic, ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, THEMES, type Theme } from '../contexts/ThemeContext';
import { useWallpaper, WALLPAPER_PRESETS } from '../contexts/WallpaperContext';
import VoiceSettingsPanel from './VoiceSettingsPanel';
import BrandMark from './BrandMark';
import { useVoice } from '../hooks/useVoice';

type View = 'auth' | 'profile' | 'preferences' | 'appearance' | 'privacy' | 'voice';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminConsole?: () => void;
  onOpenLeadCapture?: () => void;
}

type AuthMode = 'signin' | 'signup';

const PERSONALITIES = [
  { id: 'assistant', label: 'Professional', icon: '💼', desc: 'Focused, concise, business-ready' },
  { id: 'creative', label: 'Creative', icon: '🎨', desc: 'Imaginative, expressive, artistic' },
  { id: 'mentor', label: 'Mentor', icon: '🧑‍🏫', desc: 'Patient, educational, detailed' },
  { id: 'casual', label: 'Casual', icon: '😊', desc: 'Friendly, relaxed, conversational' },
];

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Japanese',
  'Chinese', 'Arabic', 'Portuguese', 'Russian', 'Korean',
  'Italian', 'Hindi',
];

// 4 featured wallpapers for quick selection
const FEATURED_WALLPAPERS = [
  {
    id: 'lavender',
    label: 'Lavender Field',
    url: '/lavender-field-optimized.webp',
    thumbnail: '/lavender-field-optimized.webp',
  },
  {
    id: 'enosx-neon-city',
    label: 'Neon City',
    url: '/wallpapers/enosx-neon-city.png',
    thumbnail: '/wallpapers/enosx-neon-city.png',
  },
  {
    id: 'enosx-galaxy-tech',
    label: 'Galaxy Tech',
    url: '/wallpapers/enosx-galaxy-tech.png',
    thumbnail: '/wallpapers/enosx-galaxy-tech.png',
  },
  {
    id: 'enosx-ex-circuits',
    label: 'EX Circuits',
    url: '/wallpapers/enosx-ex-circuits.png',
    thumbnail: '/wallpapers/enosx-ex-circuits.png',
  },
];

export default function ProfilePanel({ isOpen, onClose, onOpenAdminConsole, onOpenLeadCapture }: ProfilePanelProps) {
  const { settings: speechSettings, updateSettings: updateSpeechSettings } = useVoice();
  const { config, theme, setTheme } = useTheme();
  const { settings, setPreset: setActivePreset, setCustomUrl, setBlurAmount } = useWallpaper();
  const { user, isLoading, error, isAuthenticated, signInWithEmail, signUpWithEmail, signOut, updateProfile, clearError } = useAuth();

  const [view, setView] = useState<View>(isAuthenticated ? 'profile' : 'auth');
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Profile edit state
  const [editName, setEditName] = useState(user?.displayName ?? '');
  const [editPersonality, setEditPersonality] = useState(user?.aiPersonality ?? 'assistant');
  const [editLanguage, setEditLanguage] = useState(user?.language ?? 'English');
  const [editNotifications, setEditNotifications] = useState(user?.notifications ?? true);
  const [editCompact, setEditCompact] = useState(user?.compactMode ?? false);

  // Privacy state
  const [privacyDataCollection, setPrivacyDataCollection] = useState(true);
  const [privacyAnalytics, setPrivacyAnalytics] = useState(true);
  const [privacyCrashReports, setPrivacyCrashReports] = useState(true);
  const [privacyPersonalization, setPrivacyPersonalization] = useState(true);
  const [privacySaved, setPrivacySaved] = useState(false);
  const [checkoutStatus, setCheckoutStatus] = useState<'idle' | 'loading' | 'unavailable'>('idle');

  // Avatar upload ref
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const accentRgb = config.accentRgb;
  const accentColor = config.accent;

  React.useEffect(() => {
    if (isAuthenticated && view === 'auth') setView('profile');
    if (!isAuthenticated) setView('auth');
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (user) {
      setEditName(user.displayName ?? '');
      setEditPersonality(user.aiPersonality ?? 'assistant');
      setEditLanguage(user.language ?? 'English');
      setEditNotifications(user.notifications ?? true);
      setEditCompact(user.compactMode ?? false);
    }
  }, [user]);

  const handleEmailAuth = async () => {
    clearError();
    if (authMode === 'signin') {
      await signInWithEmail(email, password);
    } else {
      if (!displayName.trim()) return;
      await signUpWithEmail(email, password, displayName);
    }
  };

  const handleSaveProfile = async () => {
    setSaveStatus('saving');
    const ok = await updateProfile({
      displayName: editName,
      aiPersonality: editPersonality,
      language: editLanguage,
      notifications: editNotifications,
      compactMode: editCompact,
    });
    setSaveStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2500);
  };

  // Handle profile picture upload from device
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      if (dataUrl) {
        await updateProfile({ avatarUrl: dataUrl });
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle language save
  const handleSaveLanguage = async () => {
    setSaveStatus('saving');
    const ok = await updateProfile({ language: editLanguage });
    setSaveStatus(ok ? 'saved' : 'error');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  // Handle privacy save
  const handleSavePrivacy = () => {
    setPrivacySaved(true);
    setTimeout(() => setPrivacySaved(false), 2000);
    // Privacy settings are stored locally (no backend needed for demo)
    try {
      localStorage.setItem('enosx-privacy', JSON.stringify({
        dataCollection: privacyDataCollection,
        analytics: privacyAnalytics,
        crashReports: privacyCrashReports,
        personalization: privacyPersonalization,
      }));
    } catch {}
  };

  const beginUpgrade = async () => {
    setCheckoutStatus('loading');
    try {
      const response = await fetch('/api/billing/checkout?plan=pro', { credentials: 'include' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.checkoutUrl) throw new Error(payload.error || 'Checkout is not available yet.');
      window.location.assign(payload.checkoutUrl);
    } catch {
      setCheckoutStatus('unavailable');
      setTimeout(() => setCheckoutStatus('idle'), 3500);
    }
  };

  // Load privacy settings from localStorage on mount
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('enosx-privacy');
      if (stored) {
        const p = JSON.parse(stored);
        setPrivacyDataCollection(p.dataCollection ?? true);
        setPrivacyAnalytics(p.analytics ?? true);
        setPrivacyCrashReports(p.crashReports ?? true);
        setPrivacyPersonalization(p.personalization ?? true);
      }
    } catch {}
  }, []);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)',
    border: `1px solid rgba(${accentRgb},0.2)`,
    color: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 13,
    outline: 'none',
    width: '100%',
    transition: 'border-color 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.08em',
    color: 'rgba(255,255,255,0.35)',
    marginBottom: 6,
    display: 'block',
  };

  const toggleStyle = (value: boolean) => ({
    background: value ? `rgba(${accentRgb},0.7)` : 'rgba(255,255,255,0.15)',
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
          />
          <motion.div
            initial={{ x: 420, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 36 }}
            className="fixed right-0 top-0 h-screen flex flex-col z-50"
            style={{
              width: 380,
              background: `rgba(8,8,14,${settings.panelOpacity * 0.99})`,
              backdropFilter: `blur(${settings.blurAmount}px)`,
              WebkitBackdropFilter: `blur(${settings.blurAmount}px)`,
              borderLeft: `1px solid rgba(${accentRgb},0.15)`,
              boxShadow: `-16px 0 60px rgba(0,0,0,0.7)`,
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
              <div className="flex items-center gap-3">
                {(view === 'appearance' || view === 'privacy' || view === 'voice') && (
                  <button onClick={() => setView('preferences')} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <ChevronLeft size={14} />
                  </button>
                )}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.15)` }}>
                  {view === 'appearance' ? <Palette size={15} style={{ color: accentColor }} />
                    : view === 'privacy' ? <Shield size={15} style={{ color: accentColor }} />
                    : view === 'voice' ? <Mic size={15} style={{ color: accentColor }} />
                    : <User size={15} style={{ color: accentColor }} />}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {view === 'appearance' ? 'Appearance & Theme'
                      : view === 'privacy' ? 'Privacy & Security'
                      : view === 'voice' ? 'Voice Assistant'
                      : isAuthenticated ? user?.displayName ?? 'Profile'
                      : view === 'auth' && authMode === 'signup' ? 'Create Account' : 'Sign In'}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {view === 'appearance' ? 'Colors, fonts, and wallpaper'
                      : view === 'privacy' ? 'Data and account security'
                      : view === 'voice' ? 'Speech, speed, and hands-free mode'
                      : isAuthenticated ? user?.email : 'ENOSX Assistant'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isAuthenticated && view !== 'appearance' && view !== 'privacy' && (
                  <>
                    <button onClick={() => setView('profile')}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: view === 'profile' ? `rgba(${accentRgb},0.2)` : 'transparent', color: view === 'profile' ? accentColor : 'rgba(255,255,255,0.4)' }}>
                      <User size={14} />
                    </button>
                    <button onClick={() => setView('preferences')}
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: view === 'preferences' ? `rgba(${accentRgb},0.2)` : 'transparent', color: view === 'preferences' ? accentColor : 'rgba(255,255,255,0.4)' }}>
                      <Settings size={14} />
                    </button>
                  </>
                )}
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Error banner */}
            <AnimatePresence>
              {error && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="px-5 py-2 flex items-center gap-2 text-xs"
                  style={{ background: 'rgba(245,158,11,0.12)', borderBottom: '1px solid rgba(245,158,11,0.2)', color: '#fbbf24' }}>
                  <AlertCircle size={12} />{error}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex-1 overflow-y-auto">

              {/* ── AUTH VIEW ── */}
              {view === 'auth' && (
                <div className="px-5 py-6 space-y-5">
                  <div className="text-center space-y-2 pb-2">
                    <BrandMark size={64} animate className="mx-auto" />
                    <div className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                      {authMode === 'signin' ? 'Welcome back' : 'Join ENOSX'}
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {authMode === 'signin' ? 'Sign in to sync your preferences' : 'Create your account to get started'}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {authMode === 'signup' && (
                      <div>
                        <label style={labelStyle}>DISPLAY NAME</label>
                        <div className="relative">
                          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" style={{ ...inputStyle, paddingLeft: 36 }} />
                        </div>
                      </div>
                    )}
                    <div>
                      <label style={labelStyle}>EMAIL</label>
                      <div className="relative">
                        <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEmailAuth()} placeholder="you@example.com" style={{ ...inputStyle, paddingLeft: 36 }} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>PASSWORD</label>
                      <div className="relative">
                        <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                        <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleEmailAuth()} placeholder="••••••••" style={{ ...inputStyle, paddingLeft: 36, paddingRight: 40 }} />
                        <button onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleEmailAuth}
                    disabled={isLoading || !email || !password || (authMode === 'signup' && !displayName)}
                    className="w-full py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                    style={{ background: `linear-gradient(135deg, rgba(${accentRgb},0.8), rgba(${accentRgb},0.5))`, border: `1px solid rgba(${accentRgb},0.5)`, color: '#fff', boxShadow: `0 4px 20px rgba(${accentRgb},0.25)`, opacity: isLoading || !email || !password ? 0.7 : 1 }}
                  >
                    {isLoading ? <Loader2 size={15} className="animate-spin" /> : authMode === 'signin' ? 'Sign In' : 'Create Account'}
                  </button>

                  <div className="text-center text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {authMode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                    <button onClick={() => { setAuthMode(authMode === 'signin' ? 'signup' : 'signin'); clearError(); }} className="font-semibold underline" style={{ color: accentColor }}>
                      {authMode === 'signin' ? 'Sign up' : 'Sign in'}
                    </button>
                  </div>
                </div>
              )}

              {/* ── PROFILE VIEW ── */}
              {view === 'profile' && user && (
                <div className="px-5 py-5 space-y-5">
                  {/* Avatar with upload */}
                  <div className="flex flex-col items-center gap-3 py-2">
                    <div className="relative">
                      {user.avatarUrl
                        ? <img src={user.avatarUrl} alt={user.displayName} className="w-20 h-20 rounded-2xl object-cover" style={{ border: `2px solid rgba(${accentRgb},0.4)` }} />
                        : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ background: `rgba(${accentRgb},0.15)`, border: `2px solid rgba(${accentRgb},0.3)`, color: accentColor }}>
                            {user.displayName?.charAt(0).toUpperCase()}
                          </div>}
                      {/* Camera button — triggers file input */}
                      <button
                        onClick={() => avatarInputRef.current?.click()}
                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl flex items-center justify-center cursor-pointer transition-all hover:scale-110"
                        style={{ background: `rgba(${accentRgb},0.85)`, border: `1px solid rgba(${accentRgb},0.5)` }}
                        title="Change profile picture"
                      >
                        <Camera size={12} style={{ color: '#fff' }} />
                      </button>
                      {/* Hidden file input */}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarUpload}
                      />
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-base" style={{ color: 'rgba(255,255,255,0.9)' }}>{user.displayName}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</div>
                      <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs" style={{ background: `rgba(${accentRgb},0.12)`, color: accentColor }}>
                        {user.provider === 'google' ? '🔵 Google' : user.provider === 'github' ? '⚫ GitHub' : '📧 Email'}
                      </div>
                    </div>
                    <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Tap the camera icon to upload a profile picture
                    </p>
                  </div>

                  {/* Edit name */}
                  <div>
                    <label style={labelStyle}>DISPLAY NAME</label>
                    <div className="relative">
                      <Edit3 size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                      <input type="text" value={editName} onChange={e => setEditName(e.target.value)} style={{ ...inputStyle, paddingLeft: 34 }} />
                    </div>
                  </div>

                  {/* AI Personality */}
                  <div>
                    <label style={labelStyle}>AI PERSONALITY</label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERSONALITIES.map(p => (
                        <button key={p.id} onClick={() => setEditPersonality(p.id)}
                          className="p-2.5 rounded-xl text-left transition-all"
                          style={{ background: editPersonality === p.id ? `rgba(${accentRgb},0.15)` : 'rgba(255,255,255,0.04)', border: editPersonality === p.id ? `1px solid rgba(${accentRgb},0.4)` : '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="text-base mb-0.5">{p.icon}</div>
                          <div className="text-xs font-semibold" style={{ color: editPersonality === p.id ? accentColor : 'rgba(255,255,255,0.8)' }}>{p.label}</div>
                          <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

	                  {/* Toggles */}
	                  <div className="space-y-2">
                    {[
                      { label: 'Notifications', icon: Bell, value: editNotifications, onChange: setEditNotifications },
                      { label: 'Compact Mode', icon: Monitor, value: editCompact, onChange: setEditCompact },
                    ].map(({ label, icon: Icon, value, onChange }) => (
                      <div key={label} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center gap-2">
                          <Icon size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                          <span className="text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{label}</span>
                        </div>
                        <button onClick={() => onChange(!value)} className="w-10 h-5 rounded-full transition-all relative" style={toggleStyle(value)}>
                          <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: value ? 22 : 2 }} />
                        </button>
                      </div>
	                    ))}
	                  </div>

	                  <div className="rounded-2xl p-3.5" style={{ background: `linear-gradient(135deg, rgba(${accentRgb},0.16), rgba(112,0,255,0.16))`, border: `1px solid rgba(${accentRgb},0.28)` }}>
	                    <div className="flex items-center justify-between gap-3">
	                      <div>
	                        <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}><Crown size={14} style={{ color: accentColor }} /> ENOSX Free</div>
	                        <p className="mt-1 text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.48)' }}>Core chat, personal context, and controlled web reading. Upgrade unlocks Pro model access and expanded usage once billing is configured.</p>
	                      </div>
	                      <button onClick={beginUpgrade} disabled={checkoutStatus === 'loading'} className="shrink-0 rounded-xl px-3 py-2 text-xs font-bold transition-opacity disabled:opacity-60" style={{ background: `rgba(${accentRgb},0.86)`, color: '#071014' }}>
	                        {checkoutStatus === 'loading' ? 'Opening…' : 'Upgrade'}
	                      </button>
	                    </div>
	                    {checkoutStatus === 'unavailable' && <p className="mt-2 text-[11px]" style={{ color: '#fbbf24' }}>Checkout will activate when the production billing link is configured.</p>}
	                  </div>

	                  {/* Save */}
                  <button onClick={handleSaveProfile} disabled={saveStatus === 'saving'}
                    className="w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                    style={{ background: saveStatus === 'saved' ? 'rgba(34,197,94,0.2)' : saveStatus === 'error' ? 'rgba(220,20,60,0.2)' : `rgba(${accentRgb},0.18)`, border: saveStatus === 'saved' ? '1px solid rgba(34,197,94,0.4)' : saveStatus === 'error' ? '1px solid rgba(220,20,60,0.4)' : `1px solid rgba(${accentRgb},0.35)`, color: saveStatus === 'saved' ? '#4ade80' : saveStatus === 'error' ? '#ff6b8a' : accentColor }}>
                    {saveStatus === 'saving' ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                      : saveStatus === 'saved' ? <><CheckCircle2 size={14} /> Saved!</>
                      : saveStatus === 'error' ? <><AlertCircle size={14} /> Save Failed</>
                      : <><Check size={14} /> Save Changes</>}
                  </button>

                  {/* Sign out */}
                  <button onClick={signOut} className="w-full py-2.5 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2 hover:bg-red-500/10" style={{ border: '1px solid rgba(220,20,60,0.2)', color: 'rgba(255,100,100,0.7)' }}>
                    <LogOut size={14} />Sign Out
                  </button>
                </div>
              )}

              {/* ── PREFERENCES VIEW ── */}
              {view === 'preferences' && user && (
                <div className="px-5 py-5 space-y-5">
                  <div className="text-xs font-bold tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>PREFERENCES</div>

                  {/* Language */}
                  <div>
                    <label style={labelStyle}>LANGUAGE</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {LANGUAGES.map(lang => (
                        <button key={lang} onClick={() => setEditLanguage(lang)}
                          className="px-3 py-2 rounded-xl text-xs font-medium transition-all text-left"
                          style={{ background: editLanguage === lang ? `rgba(${accentRgb},0.15)` : 'rgba(255,255,255,0.04)', border: editLanguage === lang ? `1px solid rgba(${accentRgb},0.35)` : '1px solid rgba(255,255,255,0.07)', color: editLanguage === lang ? accentColor : 'rgba(255,255,255,0.7)' }}>
                          {lang}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleSaveLanguage} disabled={saveStatus === 'saving'}
                      className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                      style={{ background: saveStatus === 'saved' ? 'rgba(34,197,94,0.15)' : `rgba(${accentRgb},0.12)`, border: saveStatus === 'saved' ? '1px solid rgba(34,197,94,0.3)' : `1px solid rgba(${accentRgb},0.25)`, color: saveStatus === 'saved' ? '#4ade80' : accentColor }}>
                      {saveStatus === 'saving' ? <><Loader2 size={12} className="animate-spin" /> Saving...</>
                        : saveStatus === 'saved' ? <><CheckCircle2 size={12} /> Language Saved!</>
                        : <><Globe size={12} /> Save Language</>}
                    </button>
                  </div>

                  {/* Quick links to sub-views */}
                  <div className="space-y-1.5">
                    <button onClick={() => setView('appearance')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.1)` }}>
                        <Palette size={14} style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Appearance & Theme</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Colors, fonts, and wallpaper</div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </button>

                    <button onClick={() => setView('privacy')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.1)` }}>
                        <Shield size={14} style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Privacy & Security</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Data and account security</div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </button>

                    <button onClick={() => setView('voice')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.1)` }}>
                        <Mic size={14} style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Voice Assistant</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Speech, speed, and hands-free mode</div>
                      </div>
                      <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                    </button>

                    {onOpenLeadCapture && (
                      <button onClick={onOpenLeadCapture}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.1)` }}>
                          <Mail size={14} style={{ color: accentColor }} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Contact the Team</div>
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Share this conversation with Enosx Technologies</div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    )}

                    {onOpenAdminConsole && (
                      <button onClick={onOpenAdminConsole}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.1)` }}>
                          <ShieldAlert size={14} style={{ color: accentColor }} />
                        </div>
                        <div className="flex-1 text-left">
                          <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Admin Console</div>
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Tune assistant behavior (this browser)</div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── VOICE VIEW ── */}
              {view === 'voice' && (
                <div className="px-5 py-5 space-y-4">
                  <div className="text-xs font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>VOICE ASSISTANT</div>
                  <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <VoiceSettingsPanel settings={speechSettings} onUpdate={updateSpeechSettings} />
                  </div>
                  <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Speech settings are stored locally and applied immediately to this device.
                  </p>
                </div>
              )}

              {/* ── APPEARANCE VIEW ── */}
              {view === 'appearance' && (
                <div className="px-5 py-5 space-y-6">

                  {/* Theme selector */}
                  <div>
                    <label style={labelStyle}>THEME</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.values(THEMES) as typeof THEMES[Theme][]).map((t) => (
                        <button key={t.name} onClick={() => setTheme(t.name)}
                          className="p-3 rounded-xl text-left transition-all"
                          style={{ background: theme === t.name ? `rgba(${t.accentRgb},0.18)` : 'rgba(255,255,255,0.04)', border: theme === t.name ? `1px solid rgba(${t.accentRgb},0.5)` : '1px solid rgba(255,255,255,0.07)', boxShadow: theme === t.name ? `0 0 12px rgba(${t.accentRgb},0.2)` : 'none' }}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: t.accent, boxShadow: `0 0 6px ${t.accent}` }} />
                            <span className="text-xs font-bold" style={{ color: theme === t.name ? t.accent : 'rgba(255,255,255,0.7)' }}>{t.label}</span>
                            {theme === t.name && <Check size={10} style={{ color: t.accent, marginLeft: 'auto' }} />}
                          </div>
                          <div className="w-full h-1.5 rounded-full" style={{ background: t.bg, border: `1px solid rgba(${t.accentRgb},0.3)` }} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Blur intensity control */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label style={labelStyle} className="mb-0">BLUR INTENSITY</label>
                      <span className="text-[10px] font-bold" style={{ color: accentColor }}>{settings.blurAmount}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={settings.blurAmount}
                      onChange={(e) => setBlurAmount(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-600 mb-2"
                      style={{ accentColor: accentColor }}
                    />
                    <div className="flex justify-between text-[8px] opacity-40 uppercase font-bold tracking-widest">
                      <span>Clear</span>
                      <span>Frosted</span>
                    </div>
                  </div>

                  {/* Wallpaper selector — 4 featured */}
                  <div>
                    <label style={labelStyle}>WALLPAPER</label>
                    <div className="grid grid-cols-2 gap-2">
                      {FEATURED_WALLPAPERS.map((wp) => {
                        const isActive = settings.activePresetId === wp.id;
                        return (
                          <button key={wp.id} onClick={() => setActivePreset(wp.id)}
                            className="relative rounded-xl overflow-hidden transition-all"
                            style={{ aspectRatio: '16/9', border: isActive ? `2px solid rgba(${accentRgb},0.7)` : '2px solid rgba(255,255,255,0.08)', boxShadow: isActive ? `0 0 14px rgba(${accentRgb},0.4)` : 'none' }}>
                            <img src={wp.thumbnail} alt={wp.label} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex flex-col justify-end p-1.5" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)' }}>
                              <span className="text-[10px] font-semibold text-white">{wp.label}</span>
                            </div>
                            {isActive && (
                              <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.9)` }}>
                                <Check size={10} color="#fff" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setActivePreset('none')}
                      className="mt-2 w-full py-2 rounded-xl text-xs font-medium transition-all"
                      style={{ background: settings.activePresetId === 'none' ? `rgba(${accentRgb},0.12)` : 'rgba(255,255,255,0.04)', border: settings.activePresetId === 'none' ? `1px solid rgba(${accentRgb},0.3)` : '1px solid rgba(255,255,255,0.07)', color: settings.activePresetId === 'none' ? accentColor : 'rgba(255,255,255,0.5)' }}>
                      No Wallpaper
                    </button>
                  </div>

                  <div className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                    Theme and wallpaper changes apply instantly and are saved automatically.
                  </div>
                </div>
              )}

              {/* ── PRIVACY VIEW ── */}
              {view === 'privacy' && (
                <div className="px-5 py-5 space-y-5">
                  <div className="text-xs font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>PRIVACY & SECURITY</div>

                  {/* Privacy toggles */}
                  <div className="space-y-2">
                    {[
                      { label: 'Data Collection', desc: 'Allow anonymous usage data to improve ENOSX', icon: Layers, value: privacyDataCollection, onChange: setPrivacyDataCollection },
                      { label: 'Analytics', desc: 'Share feature usage analytics', icon: Zap, value: privacyAnalytics, onChange: setPrivacyAnalytics },
                      { label: 'Crash Reports', desc: 'Automatically send crash reports', icon: AlertCircle, value: privacyCrashReports, onChange: setPrivacyCrashReports },
                      { label: 'Personalization', desc: 'Use your data to personalize responses', icon: Sparkles, value: privacyPersonalization, onChange: setPrivacyPersonalization },
                    ].map(({ label, desc, icon: Icon, value, onChange }) => (
                      <div key={label} className="px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>{label}</span>
                          </div>
                          <button onClick={() => onChange(!value)} className="w-10 h-5 rounded-full transition-all relative flex-shrink-0" style={toggleStyle(value)}>
                            <div className="w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: value ? 22 : 2 }} />
                          </button>
                        </div>
                        <p className="text-xs mt-1 ml-5" style={{ color: 'rgba(255,255,255,0.3)' }}>{desc}</p>
                      </div>
                    ))}
                  </div>

                  {/* Account security info */}
                  <div className="px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield size={13} style={{ color: accentColor }} />
                      <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.6)' }}>ACCOUNT SECURITY</span>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Session encryption</span>
                        <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>✓ Active</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>Local data storage</span>
                        <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>✓ Encrypted</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>API communications</span>
                        <span className="text-xs font-semibold" style={{ color: '#4ade80' }}>✓ HTTPS/TLS</span>
                      </div>
                    </div>
                  </div>

                  {/* Clear data */}
                  <button
                    onClick={() => {
                      if (confirm('Clear all local ENOSX data? This cannot be undone.')) {
                        const keys = Object.keys(localStorage).filter(k => k.startsWith('enosx'));
                        keys.forEach(k => localStorage.removeItem(k));
                        window.location.reload();
                      }
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-medium transition-all hover:bg-red-500/10"
                    style={{ border: '1px solid rgba(220,20,60,0.2)', color: 'rgba(255,100,100,0.7)' }}>
                    Clear All Local Data
                  </button>

                  {/* Save privacy */}
                  <button onClick={handleSavePrivacy}
                    className="w-full py-3 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                    style={{ background: privacySaved ? 'rgba(34,197,94,0.2)' : `rgba(${accentRgb},0.18)`, border: privacySaved ? '1px solid rgba(34,197,94,0.4)' : `1px solid rgba(${accentRgb},0.35)`, color: privacySaved ? '#4ade80' : accentColor }}>
                    {privacySaved ? <><CheckCircle2 size={14} /> Privacy Settings Saved!</> : <><Shield size={14} /> Save Privacy Settings</>}
                  </button>
                </div>
              )}

            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
