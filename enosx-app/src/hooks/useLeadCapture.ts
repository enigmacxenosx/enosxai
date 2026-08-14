/*
 * ENOSX AI — useLeadCapture
 * Opt-in lead capture stored locally (enosx_leads). Users explicitly consent
 * before any contact information is saved, and captured leads can be exported
 * as CSV for the sales/support team.
 */

import { useCallback, useState } from "react";

export interface Lead {
  name: string;
  email: string;
  phone?: string;
  interest: string;
  consentedAt: string;
  /** Conversation title the lead was captured from, if available. */
  conversation?: string;
  /** Truncated conversation transcript attached to the lead. */
  transcript?: string;
}

const STORAGE_KEY = "enosx_leads";

function loadLeads(): Lead[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Failed to load leads", error);
    return [];
  }
}

function storeLeads(leads: Lead[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
  } catch (error) {
    console.error("Failed to store leads", error);
  }
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function useLeadCapture() {
  const [leads, setLeads] = useState<Lead[]>(() => loadLeads());

  const captureLead = useCallback(
    (lead: Omit<Lead, "consentedAt"> & { conversation?: string; transcript?: string }): { ok: boolean; message: string } => {
      const name = lead.name.trim();
      const email = lead.email.trim();
      if (!name) return { ok: false, message: "Please provide your name." };
      if (!email || !isValidEmail(email)) return { ok: false, message: "Please provide a valid email address." };

      const entry: Lead = {
        ...lead,
        name,
        email,
        interest: lead.interest.trim().slice(0, 500),
        conversation: lead.conversation ? lead.conversation.slice(0, 200) : undefined,
        transcript: lead.transcript ? lead.transcript.slice(0, 8000) : undefined,
        consentedAt: new Date().toISOString(),
      };
      setLeads((current) => {
        const next = [entry, ...current];
        storeLeads(next);
        return next;
      });
      return { ok: true, message: "Thank you — the Enosx team will reach out." };
    },
    []
  );

  const removeLead = useCallback((consentedAt: string) => {
    setLeads((current) => {
      const next = current.filter((lead) => lead.consentedAt !== consentedAt);
      storeLeads(next);
      return next;
    });
  }, []);

  /** Export leads as CSV for the support/sales team. */
  const exportCsv = useCallback(() => {
    const header = "Name,Email,Phone,Interest,Conversation,Consented At";
    const rows = leads.map((lead) =>
      [
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.email.replace(/"/g, '""')}"`,
        `"${(lead.phone || "").replace(/"/g, '""')}"`,
        `"${lead.interest.replace(/"/g, '""')}"`,
        `"${(lead.conversation || "").replace(/"/g, '""')}"`,
        `"${lead.consentedAt}"`,
      ].join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `enosx-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, [leads]);

  const clearLeads = useCallback(() => {
    setLeads([]);
    storeLeads([]);
  }, []);

  return { leads, captureLead, removeLead, exportCsv, clearLeads };
}
