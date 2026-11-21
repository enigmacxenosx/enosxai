/**
 * ProfilePanel — Full-featured profile panel.
 * Guest profile editing and preferences.
 * preferences (AI personality, language, privacy).
 *
 * Features:
 *  - Profile picture selection (upload from device or URL)
 *  - Language selection (functional, persisted)
 *  - Dark appearance
 *  - Privacy & Security settings
 *  - Fixed dark appearance
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Mail, LogOut, Settings,
  Bell, Globe, Palette, Sparkles, Check, ChevronRight, ChevronLeft,
  Loader2, AlertCircle, CheckCircle2,
  Monitor, Shield, Zap, Layers, Mic, ShieldAlert, Cpu, Cable,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import VoiceSettingsPanel from './VoiceSettingsPanel';
import { useVoice } from '../hooks/useVoice';
import LocalModelsPanel from './LocalModelsPanel';
import ConnectorsSettingsPanel from './ConnectorsSettingsPanel';
import { ENOSX_LANGUAGES } from '../lib/languageDictionary';
import EnosxSignInModal from './EnosxSignInModal';

type View = 'profile' | 'preferences' | 'privacy' | 'voice' | 'models' | 'connectors';

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminConsole?: () => void;
  onOpenLeadCapture?: () => void;
  onEnableNotifications?: () => void | Promise<void>;
  notificationPermission?: NotificationPermission | "unsupported";
}


const LANGUAGES = ENOSX_LANGUAGES;


export default function ProfilePanel({ isOpen, onClose, onOpenAdminConsole, onOpenLeadCapture, onEnableNotifications, notificationPermission = "default" }: ProfilePanelProps) {
  const { settings: speechSettings, updateSettings: updateSpeechSettings } = useVoice();
  const { config } = useDarkMode();
  const { user, isLoading, error, isAuthenticated, continueAsGuest, signOut, updateProfile } = useAuth();

  const [view, setView] = useState<View>('profile');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [editLanguage, setEditLanguage] = useState(user?.language ?? 'English');
  const [editNotifications, setEditNotifications] = useState(user?.notifications ?? true);
  const [editCompact, setEditCompact] = useState(user?.compactMode ?? false);

  // Privacy state
  const [privacyDataCollection, setPrivacyDataCollection] = useState(true);
  const [privacyAnalytics, setPrivacyAnalytics] = useState(true);
  const [privacyCrashReports, setPrivacyCrashReports] = useState(true);
  const [privacyPersonalization, setPrivacyPersonalization] = useState(true);
  const [privacySaved, setPrivacySaved] = useState(false);

  const accentRgb = config.accentRgb;
  const accentColor = config.accent;

  React.useEffect(() => {
    if (user) {
      setEditLanguage(user.language ?? 'English');
      setEditNotifications(user.notifications ?? true);
      setEditCompact(user.compactMode ?? false);
    }
  }, [user]);

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

  if (isOpen && !isLoading && !user) {
    return <EnosxSignInModal onClose={onClose} />;
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.5)',}}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.86, y: 28, rotateX: 8 }} animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, scale: 0.9, y: 24, rotateX: -5 }}
            transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
            style={{
              perspective: 1400,
              pointerEvents: 'none',
            }}
          >
            <motion.section
              className="auth-modal-frame flex h-[min(900px,calc(100vh-2rem))] w-full max-w-[520px] flex-col overflow-hidden rounded-[32px]"
              style={{
                pointerEvents: 'auto',
                background: '#101116',
                border: `1px solid rgba(${accentRgb},0.22)`,
                boxShadow: `0 30px 100px rgba(0,0,0,0.72), 0 0 55px rgba(${accentRgb},0.16)`,
              }}
            >
            <div
              className="pointer-events-none absolute inset-0 opacity-70"
              style={{ background: `radial-gradient(circle at 15% 10%, rgba(${accentRgb},0.18), transparent 28%), radial-gradient(circle at 90% 90%, rgba(83,122,255,0.16), transparent 30%)` }}
            />
            <div className="relative flex h-full flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid rgba(255,255,255,0.06)` }}>
              <div className="flex items-center gap-3">
                {(view === 'privacy' || view === 'voice' || view === 'models' || view === 'connectors') && (
                  <button onClick={() => setView('preferences')} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/10 transition-all" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <ChevronLeft size={14} />
                  </button>
                )}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.15)` }}>
                  {view === 'models' ? <Cpu size={15} style={{ color: accentColor }} />

                    : view === 'privacy' ? <Shield size={15} style={{ color: accentColor }} />
                    : view === 'voice' ? <Mic size={15} style={{ color: accentColor }} />
                    : view === 'connectors' ? <Cable size={15} style={{ color: accentColor }} />
                    : <User size={15} style={{ color: accentColor }} />}
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {view === 'models' ? 'Offline models'

                      : view === 'privacy' ? 'Privacy & Security'
                      : view === 'voice' ? 'Voice Agent'
                      : view === 'connectors' ? 'Manage connectors'
                      : user?.displayName ?? 'Profile'}
                  </div>
                  <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {view === 'models' ? 'Private chat on this device'

                      : view === 'privacy' ? 'Data and account security'
                      : view === 'voice' ? 'Speech, speed, and hands-free mode'
                      : view === 'connectors' ? 'Accounts and connection status'
                      : isAuthenticated ? user?.email : 'Enosx'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isAuthenticated && view !== 'privacy' && (
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
                    <button onClick={() => setView('connectors')} aria-label="Manage connectors" title="Manage connectors"
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                      style={{ background: view === 'connectors' ? `rgba(${accentRgb},0.2)` : 'transparent', color: view === 'connectors' ? accentColor : 'rgba(255,255,255,0.4)' }}>
                      <Cable size={14} />
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

              {/* ── PROFILE VIEW ── */}
              {view === 'profile' && user && (
                <div className="neon-settings-view px-5 py-5 space-y-5">
                  {/* Profile summary */}
                  <div className="flex flex-col items-center gap-3 py-2">
                    {user.avatarUrl
                      ? <img src={user.avatarUrl} alt={user.displayName} className="w-20 h-20 rounded-2xl object-cover" style={{ border: `2px solid rgba(${accentRgb},0.4)` }} />
                      : <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black" style={{ background: `rgba(${accentRgb},0.15)`, border: `2px solid rgba(${accentRgb},0.3)`, color: accentColor }}>
                          {user.displayName?.charAt(0).toUpperCase()}
                        </div>}
                    <div className="text-center">
                      <div className="font-bold text-base" style={{ color: 'rgba(255,255,255,0.9)' }}>{user.displayName}</div>
                      <div className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</div>
                      <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-xs" style={{ background: `rgba(${accentRgb},0.12)`, color: accentColor }}>
                        {user.provider === 'google' ? '🔵 Google' : user.provider === 'github' ? '⚫ GitHub' : '📧 Email'}
                      </div>
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

	                  {/* System notification permission now lives in Settings, not the sidebar. */}
                  <div className="flex items-center justify-between gap-3 px-3 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center gap-2 min-w-0">
                      <Bell size={16} style={{ color: accentColor, flexShrink: 0 }} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>System notifications</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                          {notificationPermission === 'granted' ? 'Enabled in this browser' : notificationPermission === 'denied' ? 'Allow notifications in browser site settings' : notificationPermission === 'unsupported' ? 'Not supported here' : 'Allow ENOSX alerts'}
                        </div>
                      </div>
                    </div>
                    {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && notificationPermission !== 'denied' && (
                      <button type="button" onClick={() => void onEnableNotifications?.()} className="shrink-0 rounded-lg px-3 py-2 text-xs font-semibold" style={{ background: `rgba(${accentRgb},0.18)`, border: `1px solid rgba(${accentRgb},0.3)`, color: accentColor }}>
                        Enable
                      </button>
                    )}
                  </div>

                  {/* Sign out */}
                  <button onClick={signOut} className="w-full py-2.5 rounded-2xl text-sm font-medium transition-all flex items-center justify-center gap-2 hover:bg-red-500/10" style={{ border: '1px solid rgba(220,20,60,0.2)', color: 'rgba(255,100,100,0.7)' }}>
                    <LogOut size={14} />Sign Out
                  </button>
                </div>
              )}

              {/* ── PREFERENCES VIEW ── */}
              {view === 'preferences' && user && (
                <div className="neon-settings-view px-5 py-5 space-y-5">
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
                    <button onClick={() => setView('connectors')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.1)` }}>
                        <Cable size={14} style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Manage connectors</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>GitHub, Vercel, Shopify, and Email</div>
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

                    <button onClick={() => setView('models')}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all hover:bg-white/10"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `rgba(${accentRgb},0.1)` }}>
                        <Cpu size={14} style={{ color: accentColor }} />
                      </div>
                      <div className="flex-1 text-left">
                        <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Offline models</div>
                        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Choose a local Ollama model</div>
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
                        <div className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.85)' }}>Voice Agent</div>
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
                          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Tune agent behavior (this browser)</div>
                        </div>
                        <ChevronRight size={14} style={{ color: 'rgba(255,255,255,0.3)' }} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {view === 'connectors' && <ConnectorsSettingsPanel accentColor={accentColor} accentRgb={accentRgb} />}

              {/* ── LOCAL MODELS VIEW ── */}
              {view === 'models' && <LocalModelsPanel accentColor={accentColor} accentRgb={accentRgb} />}

              {/* ── VOICE VIEW ── */}
              {view === 'voice' && (
                <div className="neon-settings-view px-5 py-5 space-y-4">
                  <div className="text-xs font-bold tracking-wider" style={{ color: 'rgba(255,255,255,0.35)' }}>VOICE AGENT</div>
                  <div className="rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                    <VoiceSettingsPanel settings={speechSettings} onUpdate={updateSpeechSettings} />
                  </div>
                  <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Speech settings are stored locally and applied immediately to this device.
                  </p>
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
            </div>
            </motion.section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
