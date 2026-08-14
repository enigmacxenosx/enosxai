/*
 * ENOSX AI — shareConversation
 * Support handoff and shareable sessions. Exports the current conversation
 * as plain text or Markdown, builds a WhatsApp handoff link pre-filled with
 * the transcript, and offers a mailto escalation path.
 * Official channels: WhatsApp +254 798 303 978, Enosxtech@gmail.com
 */

import { Conversation } from "@/lib/types";

const WHATSAPP_NUMBER = "254798303978";
const EMAIL_ADDRESS = "Enosxtech@gmail.com";

export function formatTranscript(conversation: Conversation): string {
  const header = [
    `Conversation: ${conversation.title || "New Chat"}`,
    `Started: ${new Date(conversation.createdAt).toLocaleString()}`,
    `Messages: ${conversation.messages.length}`,
    "─".repeat(50),
    "",
  ].join("\n");

  const lines = conversation.messages
    .map((message) => {
      const who = message.role === "user" ? "You" : "ENOSX AI";
      const timestamp = new Date(message.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `[${timestamp}] ${who}:\n${message.content || "(message in progress)"}\n`;
    })
    .join("\n");

  return `${header}${lines}`;
}

function stripMarkdownForWhatsApp(text: string): string {
  return text
    .replace(/!\[.*?\]\((.*?)\)/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[`*_#>]/g, "")
    .replace(/```[\s\S]*?```/g, "(code block)");
}

export function buildWhatsAppHandoff(conversation: Conversation): string {
  const intro = `Hello Enosx support, I was chatting with ENOSX AI and need help with the following conversation titled "${conversation.title || "New Chat"}":\n\n`;
  const body = stripMarkdownForWhatsApp(formatTranscript(conversation));
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`${intro}${body}`)}`;
  // WhatsApp web links have a practical length limit; fall back to a shorter summary
  if (url.length > 2000) {
    const lastUserMessages = conversation.messages
      .filter((m) => m.role === "user")
      .slice(-5)
      .map((m) => stripMarkdownForWhatsApp(m.content).slice(0, 300))
      .join("\n\n");
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`${intro}${lastUserMessages}\n\n(Full transcript available — please open ENOSX AI for context.)`)}`;
  }
  return url;
}

export function buildEmailHandoff(conversation: Conversation): string {
  const subject = encodeURIComponent(`ENOSX AI support — ${conversation.title || "New Chat"}`);
  const body = encodeURIComponent(
    `Hello Enosx support team,\n\nI was chatting with ENOSX AI and need help with the following conversation:\n\n${formatTranscript(conversation)}`
  );
  return `mailto:${EMAIL_ADDRESS}?subject=${subject}&body=${body}`;
}

export function downloadTranscript(conversation: Conversation, format: "txt" | "md" = "txt") {
  const content = format === "md" ? formatTranscript(conversation) : formatTranscript(conversation);
  const mime = format === "md" ? "text/markdown" : "text/plain";
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `enosx-${(conversation.title || "chat").replace(/[^a-z0-9]+/gi, "-").toLowerCase().slice(0, 40)}-${new Date().getTime()}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

export async function copyTranscript(conversation: Conversation): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(formatTranscript(conversation));
    return true;
  } catch (error) {
    console.error("Copy failed", error);
    return false;
  }
}
