import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, LockKeyhole, ShieldAlert } from "lucide-react";

interface GodModeSecurityBannerProps {
  isOpen: boolean;
  onAcknowledge: () => void;
  onCancel: () => void;
}

const safetyChecks = [
  "Use only systems, networks, and applications you own or are explicitly authorized to assess.",
  "GOD MODE simulations are educational previews. They do not scan, probe, transmit packets, or collect credentials.",
  "Stop immediately and obtain written authorization if scope, ownership, or permission is unclear.",
];

export default function GodModeSecurityBanner({
  isOpen,
  onAcknowledge,
  onCancel,
}: GodModeSecurityBannerProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[105] flex items-center justify-center bg-slate-950/75 px-4 py-8 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-labelledby="god-mode-warning-title"
        >
          <motion.section
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 18 }}
            className="w-full max-w-2xl overflow-hidden rounded-3xl border border-amber-400/40 bg-slate-950/95 shadow-[0_0_80px_rgba(245,158,11,0.18)]"
          >
            <div className="flex items-center gap-3 border-b border-amber-300/20 bg-amber-400/10 px-6 py-4">
              <div className="rounded-xl border border-amber-300/30 bg-amber-300/10 p-2 text-amber-300">
                <ShieldAlert size={24} />
              </div>
              <div>
                <p className="text-[11px] font-bold tracking-[0.22em] text-amber-300">SECURITY NOTICE</p>
                <h2 id="god-mode-warning-title" className="text-lg font-bold text-white">GOD MODE — Authorized Lab Use Only</h2>
              </div>
            </div>

            <div className="space-y-5 px-6 py-6 text-sm leading-6 text-slate-200">
              <p>
                This workspace is configured for responsible cybersecurity education. Continue only when your activity is within a clearly authorized lab scope.
              </p>

              <div className="space-y-3">
                {safetyChecks.map((check) => (
                  <div key={check} className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3">
                    <LockKeyhole size={17} className="mt-0.5 shrink-0 text-cyan-300" />
                    <span>{check}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-red-100">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />
                <p>
                  Never use this interface for unauthorized access, disruption, credential collection, or data exfiltration.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-white/10 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onCancel}
                className="rounded-xl border border-white/15 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/8"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onAcknowledge}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-200"
              >
                <CheckCircle2 size={17} />
                I understand — enter GOD MODE
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
