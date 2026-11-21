import type { VercelRequest, VercelResponse } from "@vercel/node";
import errorReportHandler from "../api-handlers/error-report";

/**
 * ENOSX AI — /api/feedback
 * Collects 1–5 star ratings and optional notes on agent responses so the
 * team can measure answer quality over time. Delivered by
 * email through Resend (RESEND_API_KEY + ERROR_REPORT_FROM). Feedback is
 * rate-limited per IP and never includes the user's full conversation.
 */

const SUPPORT_RECIPIENTS = ["enosxtech@gmail.com", "enosxservices@gmail.com"];
const MAX_BODY_CHARS = 4_000;
const MAX_NOTE_CHARS = 800;
const RATE_WINDOW_MS = 60 * 60 * 1_000;
const MAX_FEEDBACK_PER_IP_PER_HOUR = 30;
const feedbackCounts = new Map<string, { count: number; startedAt: number }>();

function text(value: unknown, maxLength: number) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ").slice(0, maxLength)
    : "";
}

function isAllowedOrigin(value: string) {
  try {
    const origin = new URL(value);
    const host = origin.hostname.toLowerCase();
    if (origin.protocol === "tauri:" && host === "localhost") return true;
    if (origin.protocol !== "http:" && origin.protocol !== "https:") return false;
    return host === "localhost" || host === "127.0.0.1" || host === "enosx.ai" || host.endsWith(".enosx.ai") || host.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawMode = req.query.mode;
  const mode = Array.isArray(rawMode) ? rawMode[0] : rawMode;
  if (mode === "error-report") return errorReportHandler(req, res);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }
  const origin = req.headers.origin;
  if (typeof origin !== "string" || !isAllowedOrigin(origin)) {
    return res.status(403).json({ ok: false, error: "Origin not allowed" });
  }

  const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ ok: false, error: "Invalid feedback" });
  }
  if (JSON.stringify(body).length > MAX_BODY_CHARS) {
    return res.status(413).json({ ok: false, error: "Feedback is too large" });
  }

  // Keep accepting legacy binary clients while the current UI sends 1–5 stars.
  const rating = Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5
    ? body.rating
    : body.rating === "up" ? 5 : body.rating === "down" ? 1 : 0;
  if (!rating) return res.status(400).json({ ok: false, error: "Rating must be between 1 and 5 stars" });

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const prior = feedbackCounts.get(ip);
  if (prior && now - prior.startedAt < RATE_WINDOW_MS && prior.count >= MAX_FEEDBACK_PER_IP_PER_HOUR) {
    return res.status(429).json({ ok: false, error: "Feedback limit reached" });
  }
  feedbackCounts.set(ip, !prior || now - prior.startedAt >= RATE_WINDOW_MS ? { count: 1, startedAt: now } : { ...prior, count: prior.count + 1 });

  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.ERROR_REPORT_FROM;
  if (!apiKey || !sender) {
    return res.status(503).json({ ok: false, error: "Feedback delivery is not configured" });
  }

  const details = [
    "ENOSX AI response feedback",
    `Rating: ${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)`,
    `Received: ${new Date(now).toISOString()}`,
    `App version: ${text(body.appVersion, 32) || "unknown"}`,
    `Mode: ${text(body.aiMode, 32) || "unknown"}`,
    `Message reference: ${text(body.messageId, 80) || "not provided"}`,
    `Page: ${text(body.path, 200) || "/"}`,
    "",
    "Note:",
    text(body.note, MAX_NOTE_CHARS) || "(none)",
    "",
    "Privacy note: no conversation text, files, account credentials, or client IP are included.",
  ].join("\n");

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: sender,
        to: SUPPORT_RECIPIENTS,
        subject: `[ENOSX AI] Response feedback (${rating}/5 stars)`,
        text: details,
      }),
    });
    if (!response.ok) {
      console.error("Feedback email provider rejected the message", response.status);
      return res.status(502).json({ ok: false, error: "Could not deliver the feedback" });
    }
    return res.status(202).json({ ok: true });
  } catch (error) {
    console.error("Feedback email delivery failed", error instanceof Error ? error.name : "unknown");
    return res.status(502).json({ ok: false, error: "Could not deliver the feedback" });
  }
}
