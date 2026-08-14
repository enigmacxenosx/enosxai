/*
 * ENOSX AI — AdminConsoleDialog
 * Optional admin console for tuning the assistant without redeploying.
 * All changes are additive: verified identity, support routing, and accuracy
 * guardrails can never be removed from the local config. A simple unlock
 * gate prevents casual visitors from editing the settings.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Unlock, ShieldAlert, X } from "lucide-react";
import { AdminConfig, useAdminConsole } from "@/hooks/useAdminConsole";
import { toast } from "sonner";

interface AdminConsoleDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

function Gate() {
  return (
    <div className="px-4 py-10 text-center">
      <span className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-3 text-white/60">
        <Lock size={20} />
      </span>
      <p className="text-sm font-medium text-white mb-1.5">Admin console</p>
      <p className="text-xs text-white/50 leading-relaxed mb-4 max-w-xs mx-auto">
        This area adjusts how the assistant behaves in this browser. Unlock to make changes.
      </p>
    </div>
  );
}

export default function AdminConsoleDialog({ isOpen, onClose }: AdminConsoleDialogProps) {
  const { config, unlock, lock, updateConfig, getAdminContext } = useAdminConsole();
  const [instructions, setInstructions] = useState(config.extraInstructions);
  const [facts, setFacts] = useState(config.extraFacts);

  if (!isOpen) return null;

  const handleSave = () => {
    updateConfig({ extraInstructions: instructions, extraFacts: facts });
    toast.success("Admin context saved. New conversations will use it immediately.");
  };

  const handleUnlock = () => {
    unlock();
    toast.success("Admin console unlocked.");
  };

  const contextSummary = getAdminContext().trim();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      style={{ background: "rgba(0, 0, 0, 0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-lg rounded-2xl border border-white/10 overflow-hidden"
        style={{ background: "rgba(10, 12, 18, 0.92)" }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldAlert size={14} className="text-white/60" />
            Admin console
          </h3>
          <div className="flex items-center gap-1">
            {config.unlocked && (
              <button
                onClick={lock}
                className="h-6 px-2.5 rounded-md bg-white/5 hover:bg-white/10 text-[11px] font-medium text-white/60 flex items-center gap-1.5 transition-colors"
              >
                <Lock size={11} />
                Lock
              </button>
            )}
            <button
              onClick={onClose}
              className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {!config.unlocked ? (
          <Gate />
        ) : (
          <div className="flex flex-col">
            <div className="px-4 py-3 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/70">Additional instructions</label>
              <textarea
                value={instructions}
                onChange={(event) => setInstructions(event.target.value)}
                rows={5}
                placeholder="Extra instructions appended to the system prompt (cannot remove verified identity or guardrails)…"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            <div className="px-4 py-3 flex flex-col gap-1.5">
              <label className="text-xs font-medium text-white/70">Additional verified facts</label>
              <textarea
                value={facts}
                onChange={(event) => setFacts(event.target.value)}
                rows={3}
                placeholder="One verified company fact per line…"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-colors resize-none"
              />
            </div>

            <div className="px-4 py-2 border-t border-white/10 flex items-center justify-end gap-2">
              <button
                onClick={handleSave}
                className="h-8 px-4 rounded-lg bg-white/10 hover:bg-white/15 active:scale-[0.98] text-xs font-medium text-white transition-all"
              >
                Save context
              </button>
            </div>

            {contextSummary && (
              <p className="px-4 py-2 border-t border-white/10 text-[11px] text-white/40">
                Active additive context covers {contextSummary.split("\n").length} line{contextSummary.split("\n").length === 1 ? "" : "s"} in this browser only.
              </p>
            )}

            {!contextSummary && (
              <p className="px-4 py-3 text-[11px] text-white/40">
                No additional context has been configured yet. Changes stay in this browser and never affect other users.
              </p>
            )}
          </div>
        )}

        {!config.unlocked && (
          <div className="px-4 py-3 border-t border-white/10 flex justify-center">
            <button
              onClick={handleUnlock}
              className="h-8 px-4 rounded-lg bg-white/10 hover:bg-white/15 active:scale-[0.98] text-xs font-medium text-white flex items-center gap-1.5 transition-all"
            >
              <Unlock size={12} />
              Unlock admin console
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
