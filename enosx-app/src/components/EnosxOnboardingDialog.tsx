import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Image as ImageIcon,
  Sparkles,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useWallpaper, WALLPAPER_PRESETS } from "@/contexts/WallpaperContext";
import type { UserProfile } from "@/contexts/AuthContext";

const LANGUAGES = [
  "English",
  "Swahili",
  "Spanish",
  "French",
  "German",
  "Arabic",
  "Portuguese",
  "Japanese",
  "Chinese",
  "Hindi",
];

const PERSONALITIES = [
  { id: "assistant", label: "Professional", description: "Focused, clear, and business-ready" },
  { id: "creative", label: "Creative", description: "Imaginative, expressive, and bold" },
  { id: "mentor", label: "Mentor", description: "Patient, educational, and detailed" },
  { id: "casual", label: "Casual", description: "Friendly, relaxed, and conversational" },
];

const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];

type OnboardingValues = {
  displayName: string;
  language: string;
  wallpaper: string;
  gender: string;
  personality: string;
  personalization: boolean;
  notifications: boolean;
};

interface EnosxOnboardingDialogProps {
  isOpen: boolean;
  user: UserProfile | null;
  onClose: () => void;
  onSaved?: (values: OnboardingValues) => void;
  updateProfile?: (updates: Partial<UserProfile>) => Promise<boolean>;
}

const defaultValues: OnboardingValues = {
  displayName: "",
  language: "English",
  wallpaper: "enosx-neon-city",
  gender: "Prefer not to say",
  personality: "assistant",
  personalization: true,
  notifications: true,
};

export default function EnosxOnboardingDialog({
  isOpen,
  user,
  onClose,
  onSaved,
  updateProfile,
}: EnosxOnboardingDialogProps) {
  const { config } = useTheme();
  const { setPreset } = useWallpaper();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<OnboardingValues>(defaultValues);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setStep(0);
    setValues({
      ...defaultValues,
      displayName: user?.displayName ?? "",
      language: user?.language ?? "English",
      personality: user?.aiPersonality ?? "assistant",
    });
  }, [isOpen, user]);

  const selectedWallpaper = useMemo(
    () => WALLPAPER_PRESETS.find((preset) => preset.id === values.wallpaper) ?? WALLPAPER_PRESETS[1],
    [values.wallpaper],
  );

  const setValue = <K extends keyof OnboardingValues>(key: K, value: OnboardingValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const savePreferences = async () => {
    setIsSaving(true);
    setPreset(values.wallpaper);
    try {
      localStorage.setItem("enosx-onboarding-complete", "true");
      localStorage.setItem("enosx-preferences", JSON.stringify(values));
    } catch {
      // Local persistence is best-effort for private browsing mode.
    }
    if (updateProfile && user) {
      await updateProfile({
        displayName: values.displayName.trim() || user.displayName,
        language: values.language,
        aiPersonality: values.personality,
        notifications: values.notifications,
      });
    }
    setIsSaving(false);
    onSaved?.(values);
    onClose();
  };

  if (!isOpen) return null;

  const steps = [
    { label: "You", icon: UserRound },
    { label: "World", icon: ImageIcon },
    { label: "Flow", icon: Sparkles },
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/75 p-4 backdrop-blur-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="enosx-onboarding-title"
          className="relative my-8 w-full max-w-3xl overflow-hidden rounded-[30px] border border-white/15 bg-[#090b13]/95 text-white shadow-[0_30px_120px_rgba(0,0,0,.65)]"
          initial={{ opacity: 0, scale: 0.92, rotateX: 10, y: 24 }}
          animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 16 }}
          transition={{ type: "spring", stiffness: 180, damping: 20 }}
          onClick={(event) => event.stopPropagation()}
          style={{ perspective: 1200 }}
        >
          <div className="pointer-events-none absolute -left-24 -top-28 h-64 w-64 rounded-full blur-3xl" style={{ background: `${config.accent}55` }} />
          <div className="pointer-events-none absolute -bottom-32 -right-20 h-72 w-72 rounded-full bg-cyan-400/15 blur-3xl" />
          <motion.div
            className="pointer-events-none absolute right-12 top-8 h-28 w-28 rounded-full border border-white/10"
            animate={{ rotate: 360, scale: [1, 1.12, 1] }}
            transition={{ rotate: { duration: 18, repeat: Infinity, ease: "linear" }, scale: { duration: 4, repeat: Infinity } }}
          />

          <div className="relative border-b border-white/10 px-6 pb-5 pt-6 sm:px-8">
            <button onClick={onClose} aria-label="Close onboarding" className="absolute right-5 top-5 rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white">
              <X size={18} />
            </button>
            <div className="mb-5 flex items-center gap-3">
              <motion.div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-300/10 text-cyan-200" animate={{ rotateY: [0, 180, 360] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}>
                <Zap size={21} />
              </motion.div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-cyan-200/70">ENOSX AI / INITIALIZE</p>
                <h2 id="enosx-onboarding-title" className="text-xl font-semibold tracking-tight sm:text-2xl">Shape your AI space</h2>
              </div>
            </div>
            <div className="flex max-w-md items-center gap-2">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const active = index === step;
                const complete = index < step;
                return (
                  <div key={item.label} className="flex min-w-0 flex-1 items-center gap-2">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs transition ${active ? "border-cyan-200 bg-cyan-200 text-slate-950" : complete ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-100" : "border-white/15 bg-white/5 text-white/35"}`}>
                      {complete ? <Check size={14} /> : <Icon size={14} />}
                    </div>
                    <span className={`hidden truncate text-[11px] font-semibold uppercase tracking-[0.14em] sm:block ${active ? "text-white" : "text-white/35"}`}>{item.label}</span>
                    {index < steps.length - 1 && <div className={`h-px flex-1 ${complete ? "bg-cyan-300/60" : "bg-white/10"}`} />}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative min-h-[390px] px-6 py-7 sm:px-8">
            <AnimatePresence mode="wait">
              {step === 0 && (
                <motion.div key="you" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }}>
                  <p className="mb-6 max-w-lg text-sm leading-6 text-white/55">Tell ENOSX how to speak with you. These choices can be changed later in your profile.</p>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <label className="sm:col-span-2"><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Display name</span><input value={values.displayName} onChange={(event) => setValue("displayName", event.target.value)} placeholder="What should ENOSX call you?" className="w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm outline-none transition placeholder:text-white/25 focus:border-cyan-300/60 focus:bg-white/[0.09]" /></label>
                    <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">Language</span><div className="relative"><Globe2 className="pointer-events-none absolute left-3 top-3.5 text-cyan-200/70" size={16} /><select value={values.language} onChange={(event) => setValue("language", event.target.value)} className="w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.06] px-10 py-3 text-sm outline-none focus:border-cyan-300/60">{LANGUAGES.map((language) => <option key={language} value={language} className="bg-slate-950">{language}</option>)}</select></div></label>
                    <div><span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-white/40">How should we refer to you?</span><div className="grid grid-cols-2 gap-2">{GENDERS.map((gender) => <button key={gender} type="button" onClick={() => setValue("gender", gender)} className={`rounded-xl border px-2 py-2 text-xs transition ${values.gender === gender ? "border-cyan-300/70 bg-cyan-300/15 text-cyan-100" : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]"}`}>{gender}</button>)}</div></div>
                  </div>
                </motion.div>
              )}
              {step === 1 && (
                <motion.div key="world" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }}>
                  <p className="mb-5 max-w-lg text-sm leading-6 text-white/55">Pick a visual atmosphere. The wallpaper changes live as you explore the choices.</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {WALLPAPER_PRESETS.filter((preset) => preset.id !== "none" && preset.thumbnail).slice(0, 12).map((preset) => (
                      <button key={preset.id} type="button" onClick={() => setValue("wallpaper", preset.id)} className={`group relative aspect-[1.25] overflow-hidden rounded-2xl border text-left transition duration-200 hover:-translate-y-1 ${values.wallpaper === preset.id ? "border-cyan-200 shadow-[0_0_24px_rgba(34,211,238,.28)]" : "border-white/10"}`}>
                        <img src={preset.thumbnail} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-110 group-hover:opacity-100" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent" />
                        <span className="absolute bottom-2 left-2 right-2 truncate text-[10px] font-semibold text-white">{preset.label}</span>
                        {values.wallpaper === preset.id && <span className="absolute right-2 top-2 rounded-full bg-cyan-200 p-1 text-slate-950"><Check size={11} /></span>}
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3"><div className="h-12 w-20 overflow-hidden rounded-xl bg-cover bg-center" style={{ backgroundImage: selectedWallpaper.url ? `url(${selectedWallpaper.url})` : undefined }} /><div><p className="text-xs font-semibold text-white">Live preview: {selectedWallpaper.label}</p><p className="mt-1 text-[11px] text-white/40">Your selection is applied when you finish.</p></div></div>
                </motion.div>
              )}
              {step === 2 && (
                <motion.div key="flow" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -28 }} transition={{ duration: 0.22 }}>
                  <p className="mb-5 max-w-lg text-sm leading-6 text-white/55">Choose the energy you want from ENOSX, plus a couple of optional controls.</p>
                  <div className="grid gap-3 sm:grid-cols-2">{PERSONALITIES.map((personality) => <button key={personality.id} type="button" onClick={() => setValue("personality", personality.id)} className={`rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 ${values.personality === personality.id ? "border-cyan-300/70 bg-cyan-300/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}><div className="flex items-center justify-between"><span className="text-sm font-semibold">{personality.label}</span>{values.personality === personality.id && <Check className="text-cyan-200" size={16} />}</div><p className="mt-1 text-xs text-white/40">{personality.description}</p></button>)}</div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2"><ToggleRow icon={<Sparkles size={16} />} label="Personalization" description="Use your choices to tailor responses" value={values.personalization} onChange={(value) => setValue("personalization", value)} /><ToggleRow icon={<Bell size={16} />} label="Helpful notifications" description="Let ENOSX surface useful reminders" value={values.notifications} onChange={(value) => setValue("notifications", value)} /></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative flex items-center justify-between border-t border-white/10 px-6 py-5 sm:px-8">
            <button type="button" onClick={() => step === 0 ? onClose() : setStep((current) => current - 1)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/45 transition hover:bg-white/10 hover:text-white"><ChevronLeft size={16} /> {step === 0 ? "Maybe later" : "Back"}</button>
            {step < 2 ? <button type="button" onClick={() => setStep((current) => current + 1)} className="flex items-center gap-2 rounded-xl bg-cyan-200 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-100 active:scale-[.98]">Continue <ChevronRight size={16} /></button> : <button type="button" disabled={isSaving} onClick={savePreferences} className="flex items-center gap-2 rounded-xl bg-cyan-200 px-5 py-2.5 text-xs font-bold text-slate-950 transition hover:bg-cyan-100 active:scale-[.98] disabled:opacity-60">{isSaving ? "Saving..." : "Launch my ENOSX"} <Zap size={15} /></button>}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function ToggleRow({ icon, label, description, value, onChange }: { icon: React.ReactNode; label: string; description: string; value: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" onClick={() => onChange(!value)} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07]"><span className="flex items-center gap-3"><span className="text-cyan-200/80">{icon}</span><span><span className="block text-xs font-semibold">{label}</span><span className="mt-1 block text-[10px] text-white/35">{description}</span></span></span><span className={`relative h-5 w-9 rounded-full transition ${value ? "bg-cyan-300" : "bg-white/15"}`}><span className={`absolute top-1 h-3 w-3 rounded-full bg-white transition ${value ? "left-5" : "left-1"}`} /></span></button>;
}

export type { OnboardingValues };
