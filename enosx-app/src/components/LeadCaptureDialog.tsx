/*
 * ENOSX AI — LeadCaptureDialog
 * Opt-in lead capture. The user explicitly consents before anything is saved,
 * and every saved lead stores the consent timestamp. Team members can export
 * leads as CSV or clear them from the same dialog.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, Download, Trash2, X } from "lucide-react";
import { Lead, useLeadCapture } from "@/hooks/useLeadCapture";
import { toast } from "sonner";

interface LeadCaptureDialogProps {
  isOpen: boolean;
  onClose: () => void;
  transcript?: string;
  conversationTitle?: string;
}

function LeadItem({ lead, onRemove }: { lead: Lead; onRemove: (at: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-white/5 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm text-white font-medium truncate">{lead.name}</p>
        <p className="text-xs text-white/50 truncate">{lead.email}{lead.phone ? ` · ${lead.phone}` : ""}</p>
        {lead.interest && <p className="text-xs text-white/40 truncate mt-0.5">{lead.interest}</p>}
      </div>
      <button
        onClick={() => onRemove(lead.consentedAt)}
        className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-white/40 hover:text-red-400 hover:bg-white/5 transition-colors"
        title="Delete this lead"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function LeadCaptureDialog({ isOpen, onClose, transcript, conversationTitle }: LeadCaptureDialogProps) {
  const { leads, captureLead, removeLead, exportCsv, clearLeads } = useLeadCapture();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [interest, setInterest] = useState("");

  if (!isOpen) return null;

  const handleCapture = () => {
    const result = captureLead({ name, email, phone, interest, conversation: conversationTitle, transcript });
    if (result.ok) {
      toast.success(result.message);
      setName("");
      setEmail("");
      setPhone("");
      setInterest("");
    } else {
      toast.error(result.message);
    }
  };

  const handleExport = () => {
    if (!leads.length) {
      toast.error("There are no captured leads to export.");
      return;
    }
    exportCsv();
    toast.success(`Exported ${leads.length} lead${leads.length === 1 ? "" : "s"} as CSV.`);
  };

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
          <h3 className="text-sm font-semibold text-white">Saved Leads</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-[55vh] overflow-y-auto">
          <div className="px-4 py-3 flex flex-col gap-2.5">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name *"
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-colors"
            />
            <input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email *"
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-colors"
            />
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Phone (optional)"
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-colors"
            />
            <input
              value={interest}
              onChange={(event) => setInterest(event.target.value)}
              placeholder="What are you interested in? (optional)"
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/30 transition-colors"
            />
            <button
              onClick={handleCapture}
              className="h-9 rounded-lg bg-white/10 hover:bg-white/15 active:scale-[0.98] text-sm font-medium text-white flex items-center justify-center gap-1.5 transition-all"
            >
              <Check size={14} />
              Save my details
            </button>
            <p className="text-[11px] text-white/40 leading-relaxed">
              Saving your details is optional and you are only saved when you press the button above.
              Your information stays in this browser and can be deleted at any time.
            </p>
          </div>

          {leads.length > 0 && (
            <>
              <div className="px-4 py-2 flex items-center justify-between border-t border-white/10">
                <span className="text-xs text-white/50">{leads.length} saved lead{leads.length === 1 ? "" : "s"}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleExport}
                    className="h-7 px-2.5 rounded-md bg-white/10 hover:bg-white/15 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
                  >
                    <Download size={12} />
                    Export CSV
                  </button>
                  <button
                    onClick={() => {
                      clearLeads();
                      toast.success("All saved leads have been cleared.");
                    }}
                    className="h-7 px-2.5 rounded-md bg-white/5 hover:bg-red-500/20 text-xs font-medium text-white/70 hover:text-red-300 flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 size={12} />
                    Clear all
                  </button>
                </div>
              </div>
              {leads.map((lead) => (
                <LeadItem key={lead.consentedAt} lead={lead} onRemove={(at) => removeLead(at)} />
              ))}
            </>
          )}

          {leads.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-white/40">
              No leads have been captured yet. Information is only saved with explicit consent.
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
