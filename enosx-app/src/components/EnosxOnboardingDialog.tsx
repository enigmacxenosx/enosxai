import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Globe2, Image, Sparkles, UserRound, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { WALLPAPER_PRESETS, useWallpaper } from "@/contexts/WallpaperContext";

interface EnosxOnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

const LANGUAGES = ["English", "Swahili", "Spanish", "French", "German", "Arabic", "Japanese", "Chinese"];
const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const PERSONALITIES = [
  { id: "assistant", label: "Professional", desc: "Clear, focused, business-ready" },
  { id: "creative", label: "Creative", desc: "Imaginative and expressive" },
  { id: "mentor", label: "Mentor", desc: "Patient and educational" },
  { id: "casual", label: "Casual", desc: "Friendly and relaxed" },
];
const ONBOARDING_PREFS_KEY = "enosx-onboarding-preferences";

interface StoredOnboardingPreferences {
  language?: string;
  gender?: string;
  wallpaper?: string;
  aiPersonality?: string;
  notifications?: boolean;
  compactMode?: boolean;
}

function readStoredPreferences(): StoredOnboardingPreferences {
  try {
    const raw = localStorage.getItem(ONBOARDING_PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export default function EnosxOnboardingDialog({ isOpen, onClose }: EnosxOnboardingDialogProps) {
  const { user, updateProfile } = useAuth();
  const { config } = useTheme();
  const { settings, setPreset, setBlurAmount, setPanelOpacity, setWallpaperOpacity } = useWallpaper();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState(() => readStoredPreferences().language ?? user?.language ?? "English");
  const [gender, setGender] = useState(() => readStoredPreferences().gender ?? user?.gender ?? "Prefer not to say");
  const [personality, setPersonality] = useState(() => readStoredPreferences().aiPersonality ?? user?.aiPersonality ?? "assistant");
  const [notifications, setNotifications] = useState(() => readStoredPreferences().notifications ?? user?.notifications ?? true);
  const [compactMode, setCompactMode] = useState(() => readStoredPreferences().compactMode ?? user?.compactMode ?? false);
  const [pointerTilt, setPointerTilt] = useState({ x: 0, y: 0 });
  const [blurAmount, setBlur] = useState(settings.blurAmount);
  const [wallpaperOpacity, setWallpaperIntensity] = useState(settings.wallpaperOpacity);
  const [panelOpacity, setPanel] = useState(settings.panelOpacity);
  const dialogRef = useRef<HTMLElement | null>(null);

  const wallpapers = useMemo(() => WALLPAPER_PRESETS.filter((preset) => preset.id !== "none").slice(0, 8), []);
  const persistPreferences = (updates: StoredOnboardingPreferences) => {
    try {
      const next = { ...readStoredPreferences(), ...updates };
      localStorage.setItem(ONBOARDING_PREFS_KEY, JSON.stringify(next));
    } catch {}
  };
  const selectLanguage = (value: string) => { setLanguage(value); persistPreferences({ language: value }); };
  const selectGender = (value: string) => { setGender(value); persistPreferences({ gender: value }); };
  const selectWallpaper = (value: string) => { setPreset(value); persistPreferences({ wallpaper: value }); };
  const updateBlur = (value: number) => { setBlur(value); setBlurAmount(value); };
  const updateWallpaperIntensity = (value: number) => { setWallpaperIntensity(value); setWallpaperOpacity(value); };
  const updatePanelOpacity = (value: number) => { setPanel(value); setPanelOpacity(value); };
  const selectPersonality = (value: string) => { setPersonality(value); persistPreferences({ aiPersonality: value }); };
  const toggleNotifications = () => { setNotifications((value) => { const next = !value; persistPreferences({ notifications: next }); return next; }); };
  const toggleCompactMode = () => { setCompactMode((value) => { const next = !value; persistPreferences({ compactMode: next }); return next; }); };

  useEffect(() => {
    if (!isOpen) return;
    const stored = readStoredPreferences();
    if (stored.language) setLanguage(stored.language);
    if (stored.gender) setGender(stored.gender);
    if (stored.aiPersonality) setPersonality(stored.aiPersonality);
    if (typeof stored.notifications === "boolean") setNotifications(stored.notifications);
    if (typeof stored.compactMode === "boolean") setCompactMode(stored.compactMode);
    if (stored.wallpaper && stored.wallpaper !== settings.activePresetId) setPreset(stored.wallpaper);
    setBlur(settings.blurAmount);
    setWallpaperIntensity(settings.wallpaperOpacity);
    setPanel(settings.panelOpacity);
  }, [isOpen]);

  const finish = async () => {
    const preferences = { language, gender, aiPersonality: personality, notifications, compactMode, wallpaper: settings.activePresetId };
    persistPreferences(preferences);
    if (user) await updateProfile(preferences);
    onClose();
  };

  const selectedWallpaperStyle = settings.activePresetId === "none"
    ? undefined
    : { backgroundImage: `linear-gradient(rgba(5,8,20,.38), rgba(5,8,20,.72)), url(${WALLPAPER_PRESETS.find((item) => item.id === settings.activePresetId)?.url ?? ""})`, backgroundSize: "cover", backgroundPosition: "center" };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 p-2 backdrop-blur-xl sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section
            ref={dialogRef}
            initial={{ opacity: 0, scale: 0.82, rotateX: 18, y: 24 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 18 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="auth-neon-shell auth-onboarding-card relative my-2 max-h-[calc(100dvh-1rem)] w-full max-w-2xl overflow-y-auto rounded-[26px] p-4 sm:my-8 sm:max-h-[calc(100dvh-2rem)] sm:rounded-[32px] sm:p-8"
            style={{ "--auth-rgb": config.accentRgb, "--auth-accent": config.accent, transform: `perspective(1200px) rotateX(${pointerTilt.x}deg) rotateY(${pointerTilt.y}deg)` } as React.CSSProperties}
            onPointerMove={(event) => {
              if (event.pointerType === "touch") return;
              const rect = dialogRef.current?.getBoundingClientRect();
              if (!rect) return;
              setPointerTilt({ x: ((event.clientY - rect.top) / rect.height - 0.5) * -3, y: ((event.clientX - rect.left) / rect.width - 0.5) * 4 });
            }}
            onPointerLeave={() => setPointerTilt({ x: 0, y: 0 })}
          >
            <div className="relative z-10 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: config.accent }}><Sparkles size={13} /> ENOSX setup sequence</div>
                <h2 className="text-2xl font-bold text-white sm:text-3xl">Make ENOSX yours.</h2>
                <p className="mt-2 max-w-lg text-sm text-white/50">Choose your defaults and we’ll shape the workspace around you.</p>
              </div>
              <button onClick={onClose} aria-label="Close onboarding" className="rounded-xl p-2 text-white/40 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
            </div>

            <div className="relative z-10 mt-6 flex items-center gap-2">
              {["Language", "Wallpaper", "You", "Finish"].map((label, index) => (
                <div key={label} className="flex flex-1 items-center gap-2">
                  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${index <= step ? "text-white" : "text-white/30"}`} style={{ background: index <= step ? `rgba(${config.accentRgb},0.8)` : "rgba(255,255,255,0.08)", boxShadow: index === step ? `0 0 18px rgba(${config.accentRgb},0.45)` : "none" }}>{index < step ? <Check size={13} /> : index + 1}</div>
                  <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-white/35 sm:block">{label}</span>
                  {index < 3 && <div className="h-px flex-1 bg-white/10" />}
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-7 min-h-[280px]">
              <AnimatePresence mode="wait">
                {step === 0 && <motion.div key="language" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-5"><div className="flex items-center gap-3"><Globe2 size={22} style={{ color: config.accent }} /><div><h3 className="font-semibold text-white">What language feels natural?</h3><p className="text-xs text-white/40">ENOSX will use this for replies and interface hints.</p></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{LANGUAGES.map((item) => <button key={item} onClick={() => selectLanguage(item)} className={`rounded-2xl border p-4 text-left text-sm transition hover:-translate-y-1 ${language === item ? "border-white/30 bg-white/15 text-white" : "border-white/10 bg-white/[0.04] text-white/55"}`} style={language === item ? { boxShadow: `0 0 22px rgba(${config.accentRgb},0.2)` } : undefined}>{item}{language === item && <Check size={14} className="mt-2" style={{ color: config.accent }} />}</button>)}</div></motion.div>}
                {step === 1 && <motion.div key="wallpaper" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-4"><div className="flex items-center gap-3"><Image size={22} style={{ color: config.accent }} /><div><h3 className="font-semibold text-white">Choose your atmosphere.</h3><p className="text-xs text-white/40">Changes apply live while you preview. Fine-tune the glass layer below.</p></div></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{wallpapers.map((item) => <button key={item.id} type="button" onClick={() => selectWallpaper(item.id)} className={`group min-h-[104px] overflow-hidden rounded-2xl border text-left transition hover:-translate-y-1 active:scale-[.98] ${settings.activePresetId === item.id ? "border-white/50 shadow-[0_0_22px_rgba(0,242,255,.2)]" : "border-white/10"}`}><div className="h-20 bg-cover bg-center transition duration-500 group-hover:scale-105 sm:h-24" style={{ backgroundImage: `url(${item.thumbnail})` }} /><div className="flex items-center justify-between bg-black/40 px-2 py-2 text-[11px] text-white/75 sm:px-3"><span className="truncate">{item.label}</span>{settings.activePresetId === item.id && <Check size={13} style={{ color: config.accent }} />}</div></button>)}</div><div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black/30 p-3" style={selectedWallpaperStyle}><div className="auth-onboarding-preview-orb" /><div className="relative z-10 flex min-h-[92px] items-end justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-cyan-100/75">Live preview</p><p className="mt-1 text-sm font-semibold text-white">{WALLPAPER_PRESETS.find((item) => item.id === settings.activePresetId)?.label ?? "ENOSX atmosphere"}</p></div><span className="rounded-full border border-white/20 bg-black/30 px-2 py-1 text-[10px] text-white/60">3D active</span></div></div><div className="grid gap-3 rounded-2xl border border-white/10 bg-white/[.035] p-3 sm:grid-cols-3"><RangeControl label="Softness" value={blurAmount} min={0} max={24} suffix="px" onChange={updateBlur} /><RangeControl label="Wallpaper" value={Math.round(wallpaperOpacity * 100)} min={40} max={100} suffix="%" onChange={(value) => updateWallpaperIntensity(value / 100)} /><RangeControl label="Glass" value={Math.round(panelOpacity * 100)} min={40} max={100} suffix="%" onChange={(value) => updatePanelOpacity(value / 100)} /></div></motion.div>}
                {step === 2 && <motion.div key="identity" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} className="space-y-5"><div className="flex items-center gap-3"><UserRound size={22} style={{ color: config.accent }} /><div><h3 className="font-semibold text-white">Tune your experience.</h3><p className="text-xs text-white/40">These choices personalize behavior, not your identity.</p></div></div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">Gender (optional)</p><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{GENDERS.map((item) => <button key={item} onClick={() => selectGender(item)} className={`rounded-xl border px-3 py-2 text-xs transition ${gender === item ? "border-white/30 bg-white/12 text-white" : "border-white/10 text-white/50"}`}>{item}</button>)}</div></div><div><p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-white/35">AI personality</p><div className="grid grid-cols-2 gap-2">{PERSONALITIES.map((item) => <button key={item.id} onClick={() => selectPersonality(item.id)} className={`rounded-xl border p-3 text-left transition ${personality === item.id ? "border-white/30 bg-white/12" : "border-white/10 bg-white/[0.03]"}`}><span className="block text-sm font-semibold text-white/85">{item.label}</span><span className="text-[11px] text-white/40">{item.desc}</span></button>)}</div></div><div className="grid grid-cols-2 gap-2"><button onClick={toggleNotifications} className={`rounded-xl border p-3 text-left text-xs ${notifications ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-white/45"}`}>Notifications<br /><span className="text-[10px] opacity-60">Helpful updates</span></button><button onClick={toggleCompactMode} className={`rounded-xl border p-3 text-left text-xs ${compactMode ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-white/45"}`}>Compact mode<br /><span className="text-[10px] opacity-60">More space for chat</span></button></div></motion.div>}
                {step === 3 && <motion.div key="finish" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-[280px] flex-col items-center justify-center text-center"><div className="auth-onboarding-orb mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `rgba(${config.accentRgb},0.18)`, color: config.accent }}><Check size={34} /></div><h3 className="text-xl font-bold text-white">Your ENOSX space is ready.</h3><p className="mt-2 max-w-sm text-sm text-white/45">We’ll remember your choices and keep them editable from your profile.</p></motion.div>}
              </AnimatePresence>
            </div>

            <div className="relative z-10 mt-6 flex items-center justify-between border-t border-white/10 pt-5"><button onClick={() => step === 0 ? onClose() : setStep(step - 1)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/45 transition hover:bg-white/10 hover:text-white">{step > 0 && <ChevronLeft size={14} />} {step === 0 ? "Maybe later" : "Back"}</button><button onClick={() => step < 3 ? setStep(step + 1) : void finish()} className="auth-primary-button flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, rgba(${config.accentRgb},0.9), rgba(${config.accentRgb},0.55))` }}>{step < 3 ? "Continue" : "Enter ENOSX"} <ChevronRight size={14} /></button></div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RangeControl({ label, value, min, max, suffix, onChange }: { label: string; value: number; min: number; max: number; suffix: string; onChange: (value: number) => void }) {
  return <label className="block text-[10px] text-white/45"><span className="mb-1 flex items-center justify-between gap-2"><span>{label}</span><span className="text-white/70">{value}{suffix}</span></span><input aria-label={label} type="range" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} className="w-full accent-cyan-300" /></label>;
}
