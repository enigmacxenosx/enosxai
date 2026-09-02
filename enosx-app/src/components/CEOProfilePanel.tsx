import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Crown, KeyRound, LockKeyhole, Save, Shield, UserRound, X } from "lucide-react";
import { toast } from "sonner";

const PROFILE_KEY = "enosx_ceo_profile_notes";

interface CEOProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CEOProfilePanel({ isOpen, onClose }: CEOProfilePanelProps) {
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) setNotes(localStorage.getItem(PROFILE_KEY) || "Founder preferences and private operating notes.");
  }, [isOpen]);

  const saveNotes = () => {
    localStorage.setItem(PROFILE_KEY, notes);
    toast.success("CEO profile notes saved on this device");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ceo-profile-title"
        >
          <motion.section
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-300/25 bg-[#101218] shadow-2xl shadow-black/60"
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-amber-300/10 via-transparent to-fuchsia-300/10 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-200"><Crown size={22} /></div>
                <div><p className="text-[10px] font-bold tracking-[0.25em] text-amber-200">GOD MODE / CEO PROFILE</p><h2 id="ceo-profile-title" className="mt-1 text-xl font-semibold text-white">Enosh Yeswa</h2></div>
              </div>
              <button onClick={onClose} className="rounded-xl p-2 text-white/45 hover:bg-white/10 hover:text-white" aria-label="Close CEO profile"><X size={18} /></button>
            </div>
            <div className="space-y-5 p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-2 flex items-center gap-2 text-cyan-200"><UserRound size={15} /><span className="text-[10px] uppercase tracking-wider">Identity</span></div><p className="font-medium">Enosh Yeswa</p><p className="mt-1 text-xs text-white/45">Founder & Chief Executive Officer</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-2 flex items-center gap-2 text-fuchsia-200"><KeyRound size={15} /><span className="text-[10px] uppercase tracking-wider">Access level</span></div><p className="font-medium">CEO-only / GOD MODE</p><p className="mt-1 text-xs text-white/45">Opened only after the GOD MODE gate</p></div>
              </div>
              <div className="rounded-2xl border border-emerald-300/15 bg-emerald-300/[0.04] p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={17} /><p className="text-xs leading-5 text-emerald-100/70"><strong className="text-emerald-200">Profile scope:</strong> this profile is for Enosh Yeswa, the ENOSX founder and CEO. The profile record and notes remain local to this device and are not a substitute for server-side authentication.</p></div></div>
              <div><label htmlFor="ceo-notes" className="mb-2 block text-xs font-medium text-white/70">Private CEO operating notes</label><textarea id="ceo-notes" value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white outline-none transition focus:border-amber-300/40" placeholder="Add founder preferences, priorities, or operating instructions..." /><button onClick={saveNotes} className="mt-3 rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-100"><Save size={15} className="mr-2 inline" />Save locally</button></div>
              <div className="flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-white/35"><Shield size={14} /><span>Protected by the GOD MODE authorization flow.</span><LockKeyhole size={13} className="ml-auto" /><span>Local profile</span></div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
