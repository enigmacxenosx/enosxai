import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BarChart3, Check, ChevronLeft, ChevronRight, Code2, Globe2, Image, Lightbulb, Search, Sparkles, UserRound, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDarkMode } from "@/contexts/DarkModeContext";
import { ENOSX_LANGUAGES } from "@/lib/languageDictionary";

interface EnosxOnboardingDialogProps { isOpen: boolean; onClose: () => void; }
const LANGUAGES = ENOSX_LANGUAGES;
const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say"];
const PERSONALITIES = [
  { id: "agent", label: "Professional", desc: "Clear, focused, business-ready" },
  { id: "creative", label: "Creative", desc: "Imaginative and expressive" },
  { id: "mentor", label: "Mentor", desc: "Patient and educational" },
  { id: "casual", label: "Casual", desc: "Friendly and relaxed" },
];
const USE_CASES = [
  { id: "everyday", label: "Everyday work", desc: "Writing, planning, and quick answers", icon: Lightbulb },
  { id: "coding", label: "Coding & GitHub", desc: "Repositories, debugging, and technical work", icon: Code2 },
  { id: "research", label: "Research & learning", desc: "Study sources, compare evidence, and learn", icon: Search },
  { id: "data", label: "Data stories", desc: "Turn CSVs and metrics into narratives", icon: BarChart3 },
  { id: "media", label: "Images & video", desc: "Create, edit, and organize media", icon: Image },
  { id: "memory", label: "Personal knowledge", desc: "Build a private memory and knowledge bank", icon: UserRound },
];
const KEY = "enosx-onboarding-preferences";
function stored() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; } }

export default function EnosxOnboardingDialog({ isOpen, onClose }: EnosxOnboardingDialogProps) {
  const { user, updateProfile } = useAuth();
  const { config } = useDarkMode();
  const initial = stored();
  const [step, setStep] = useState(0);
  const [language, setLanguage] = useState(initial.language ?? user?.language ?? "English");
  const [gender, setGender] = useState(initial.gender ?? user?.gender ?? "Prefer not to say");
  const [personality, setPersonality] = useState(initial.aiPersonality ?? user?.aiPersonality ?? "agent");
  const [useCase, setUseCase] = useState(initial.useCase ?? user?.useCase ?? "everyday");
  const [notifications, setNotifications] = useState(initial.notifications ?? user?.notifications ?? true);
  const [compactMode, setCompactMode] = useState(initial.compactMode ?? user?.compactMode ?? false);
  useEffect(() => { if (isOpen) setStep(0); }, [isOpen]);
  const finish = async () => {
    const preferences = { language, gender, aiPersonality: personality, useCase, notifications, compactMode };
    try { localStorage.setItem(KEY, JSON.stringify(preferences)); } catch {}
    if (user) await updateProfile(preferences);
    onClose();
  };
  const steps = ["Language", "Focus", "Personality", "You", "Finish"];
  return <AnimatePresence>{isOpen && <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.section initial={{ opacity: 0, scale: .96, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .98 }} className="auth-neon-shell w-full max-w-2xl rounded-[26px] border border-white/10 bg-[#111216] p-5 shadow-2xl sm:p-8">
      <div className="flex items-start justify-between"><div><div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: config.accent }}><Sparkles size={13}/> ENOSX setup sequence</div><h2 className="text-2xl font-bold text-white">Make ENOSX yours.</h2><p className="mt-2 text-sm text-white/50">Choose your defaults for a focused dark workspace.</p></div><button onClick={onClose} aria-label="Close onboarding" className="rounded-xl p-2 text-white/40 hover:bg-white/10 hover:text-white"><X size={18}/></button></div>
      <div className="mt-6 flex items-center gap-2">{steps.map((label, i) => <div key={label} className="flex flex-1 items-center gap-2"><div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${i <= step ? "text-white" : "text-white/30"}`} style={{ background: i <= step ? `rgba(${config.accentRgb},.8)` : "rgba(255,255,255,.08)" }}>{i < step ? <Check size={13}/> : i + 1}</div><span className="hidden text-[10px] font-semibold uppercase tracking-wider text-white/35 sm:block">{label}</span>{i < steps.length - 1 && <div className="h-px flex-1 bg-white/10"/>}</div>)}</div>
      <div className="mt-7 min-h-[280px]"><AnimatePresence mode="wait">
        {step === 0 && <motion.div key="language" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5"><div className="flex items-center gap-3"><Globe2 size={22} style={{ color: config.accent }}/><div><h3 className="font-semibold text-white">What language feels natural?</h3><p className="text-xs text-white/40">ENOSX will use this for replies and interface hints.</p></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{LANGUAGES.map(item => <button key={item} onClick={() => setLanguage(item)} className={`rounded-2xl border p-4 text-left text-sm ${language === item ? "border-white/30 bg-white/15 text-white" : "border-white/10 bg-white/[.04] text-white/55"}`}>{item}{language === item && <Check size={14} className="mt-2" style={{ color: config.accent }}/>}</button>)}</div></motion.div>}
        {step === 1 && <motion.div key="focus" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5"><div><h3 className="font-semibold text-white">What do you want to do first?</h3><p className="text-xs text-white/40">This sets your starter prompts and workspace emphasis.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{USE_CASES.map(item => { const Icon=item.icon; return <button key={item.id} onClick={() => setUseCase(item.id)} className={`rounded-2xl border p-3 text-left ${useCase === item.id ? "border-white/30 bg-white/12" : "border-white/10 bg-white/[.03]"}`}><Icon size={17} style={{ color: useCase === item.id ? config.accent : "rgba(255,255,255,.45)" }}/><span className="mt-2 block text-xs font-semibold text-white/85">{item.label}</span><span className="mt-1 block text-[10px] leading-4 text-white/40">{item.desc}</span></button>})}</div></motion.div>}
        {step === 2 && <motion.div key="personality" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5"><div><h3 className="font-semibold text-white">How should ENOSX communicate?</h3><p className="text-xs text-white/40">Choose the response style that fits your work.</p></div><div className="grid grid-cols-2 gap-2">{PERSONALITIES.map(item => <button key={item.id} onClick={() => setPersonality(item.id)} className={`rounded-xl border p-3 text-left ${personality === item.id ? "border-white/30 bg-white/12" : "border-white/10 bg-white/[.03]"}`}><span className="block text-sm font-semibold text-white/85">{item.label}</span><span className="text-[11px] text-white/40">{item.desc}</span></button>)}</div></motion.div>}
        {step === 3 && <motion.div key="identity" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5"><div><h3 className="font-semibold text-white">Tune your experience.</h3><p className="text-xs text-white/40">These choices personalize behavior, not your identity.</p></div><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{GENDERS.map(item => <button key={item} onClick={() => setGender(item)} className={`rounded-xl border px-3 py-2 text-xs ${gender === item ? "border-white/30 bg-white/12 text-white" : "border-white/10 text-white/50"}`}>{item}</button>)}</div><div className="grid grid-cols-2 gap-2"><button onClick={() => setNotifications(!notifications)} className={`rounded-xl border p-3 text-left text-xs ${notifications ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-white/45"}`}>Notifications<br/><span className="text-[10px] opacity-60">Helpful updates</span></button><button onClick={() => setCompactMode(!compactMode)} className={`rounded-xl border p-3 text-left text-xs ${compactMode ? "border-white/25 bg-white/10 text-white" : "border-white/10 text-white/45"}`}>Compact mode<br/><span className="text-[10px] opacity-60">More space for chat</span></button></div></motion.div>}
        {step === 4 && <motion.div key="finish" initial={{ opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} className="flex min-h-[280px] flex-col items-center justify-center text-center"><div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full" style={{ background: `rgba(${config.accentRgb},.18)`, color: config.accent }}><Check size={34}/></div><h3 className="text-xl font-bold text-white">Your ENOSX space is ready.</h3><p className="mt-2 max-w-sm text-sm text-white/45">Your preferences are saved for this device.</p></motion.div>}
      </AnimatePresence></div>
      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-5"><button onClick={() => step === 0 ? onClose() : setStep(step - 1)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white/45 hover:bg-white/10 hover:text-white">{step > 0 && <ChevronLeft size={14}/>} {step === 0 ? "Maybe later" : "Back"}</button><button onClick={() => step < 4 ? setStep(step + 1) : void finish()} className="flex items-center gap-2 rounded-xl px-5 py-3 text-xs font-bold text-white" style={{ background: `rgba(${config.accentRgb},.85)` }}>{step < 4 ? "Continue" : "Enter ENOSX"}<ChevronRight size={14}/></button></div>
    </motion.section>
  </motion.div>}</AnimatePresence>;
}
