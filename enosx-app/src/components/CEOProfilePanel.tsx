import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Crown, KeyRound, LockKeyhole, Save, Shield, UserRound, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface CEOProfilePanelProps { isOpen: boolean; onClose: () => void; }
const API_BASE = (import.meta.env.VITE_NEON_API_URL as string | undefined)?.replace(/\/$/, "") || "";

export default function CEOProfilePanel({ isOpen, onClose }: CEOProfilePanelProps) {
  const { user, isAuthenticated } = useAuth();
  const [notes, setNotes] = useState("");
  const [token, setToken] = useState(() => sessionStorage.getItem("enosx-ceo-session") || "");
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "locked" | "error">("idle");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const load = async () => {
      setStatus("loading");
      if (!API_BASE || !isAuthenticated || !user?.id || !user.email) { setStatus("locked"); return; }
      try {
        let activeToken = token;
        if (!activeToken) {
          const sessionResponse = await fetch(`${API_BASE}/auth/ceo/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, email: user.email }) });
          if (!sessionResponse.ok) throw new Error((await sessionResponse.json().catch(() => null))?.message || "CEO authorization denied");
          activeToken = (await sessionResponse.json()).token;
          sessionStorage.setItem("enosx-ceo-session", activeToken);
          if (!cancelled) setToken(activeToken);
        }
        const profileResponse = await fetch(`${API_BASE}/auth/ceo/profile`, { headers: { Authorization: `Bearer ${activeToken}` } });
        if (!profileResponse.ok) throw new Error((await profileResponse.json().catch(() => null))?.message || "CEO profile unavailable");
        const data = await profileResponse.json();
        if (!cancelled) { setNotes(data.profile?.notes || ""); setStatus("ready"); }
      } catch (error) {
        sessionStorage.removeItem("enosx-ceo-session");
        if (!cancelled) { setToken(""); setStatus("error"); toast.error(error instanceof Error ? error.message : "CEO authorization failed"); }
      }
    };
    load();
    return () => { cancelled = true; };
  }, [isOpen, isAuthenticated, user?.id, user?.email, token]);

  const saveNotes = async () => {
    if (!token || status !== "ready") return;
    const response = await fetch(`${API_BASE}/auth/ceo/profile`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ notes }) });
    if (!response.ok) { toast.error("CEO profile save denied"); return; }
    toast.success("CEO profile notes saved securely");
  };

  return <AnimatePresence>{isOpen && <motion.div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="ceo-profile-title"><motion.section className="w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-300/25 bg-[#101218] shadow-2xl shadow-black/60" initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 12 }}><div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-amber-300/10 via-transparent to-fuchsia-300/10 px-6 py-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-300/30 bg-amber-300/10 text-amber-200"><Crown size={22} /></div><div><p className="text-[10px] font-bold tracking-[0.25em] text-amber-200">GOD MODE / CEO PROFILE</p><h2 id="ceo-profile-title" className="mt-1 text-xl font-semibold text-white">Enosh Yeswa</h2></div></div><button onClick={onClose} className="rounded-xl p-2 text-white/45 hover:bg-white/10 hover:text-white" aria-label="Close CEO profile"><X size={18} /></button></div><div className="space-y-5 p-6"><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-2 flex items-center gap-2 text-cyan-200"><UserRound size={15} /><span className="text-[10px] uppercase tracking-wider">Identity</span></div><p className="font-medium">Enosh Yeswa</p><p className="mt-1 text-xs text-white/45">Founder & Chief Executive Officer</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4"><div className="mb-2 flex items-center gap-2 text-fuchsia-200"><KeyRound size={15} /><span className="text-[10px] uppercase tracking-wider">Server status</span></div><p className="font-medium">{status === "ready" ? "Verified CEO session" : status === "loading" ? "Verifying..." : "Locked"}</p><p className="mt-1 text-xs text-white/45">{API_BASE ? "Signed server authorization required" : "VITE_NEON_API_URL is not configured"}</p></div></div><div className={`rounded-2xl border p-4 ${status === "ready" ? "border-emerald-300/15 bg-emerald-300/[0.04]" : "border-amber-300/15 bg-amber-300/[0.04]"}`}><div className="flex items-start gap-3">{status === "ready" ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-300" size={17} /> : <Shield className="mt-0.5 shrink-0 text-amber-300" size={17} />}<p className="text-xs leading-5 text-white/65"><strong className="text-white">Server-verified profile:</strong> access requires an authenticated account whose email matches the server’s `ENOSX_CEO_EMAIL`. The browser cannot grant itself CEO access.</p></div></div><div><label htmlFor="ceo-notes" className="mb-2 block text-xs font-medium text-white/70">Private CEO operating notes</label><textarea id="ceo-notes" disabled={status !== "ready"} value={notes} onChange={(event) => setNotes(event.target.value)} rows={5} className="w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white outline-none transition focus:border-amber-300/40 disabled:cursor-not-allowed disabled:opacity-40" placeholder={status === "loading" ? "Verifying server session..." : "CEO authorization required"} /><button onClick={saveNotes} disabled={status !== "ready"} className="mt-3 rounded-xl bg-amber-200 px-4 py-2.5 text-sm font-semibold text-black hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"><Save size={15} className="mr-2 inline" />Save securely</button></div><div className="flex items-center gap-2 border-t border-white/10 pt-4 text-[11px] text-white/35"><LockKeyhole size={14} /><span>Signed session · 12-hour expiry · server checked</span></div></div></motion.section></motion.div>}</AnimatePresence>;
}
