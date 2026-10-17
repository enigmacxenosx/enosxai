import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPPORT_RECIPIENTS = ["enosxtech@gmail.com", "enosxservices@gmail.com"];
const MAX_BODY_CHARS = 8_000;
const RATE_WINDOW_MS = 60 * 60 * 1_000;
const MAX_REPORTS_PER_IP_PER_HOUR = 12;
const reportCounts = new Map<string, { count: number; startedAt: number }>();

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
    return res.status(400).json({ ok: false, error: "Invalid report" });
  }
  if (JSON.stringify(body).length > MAX_BODY_CHARS) {
    return res.status(413).json({ ok: false, error: "Report is too large" });
  }

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const prior = reportCounts.get(ip);
  if (prior && now - prior.startedAt < RATE_WINDOW_MS && prior.count >= MAX_REPORTS_PER_IP_PER_HOUR) {
    return res.status(429).json({ ok: false, error: "Report limit reached" });
  }
  reportCounts.set(ip, !prior || now - prior.startedAt >= RATE_WINDOW_MS ? { count: 1, startedAt: now } : { ...prior, count: prior.count + 1 });

  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.ERROR_REPORT_FROM;
  if (!apiKey || !sender) {
    return res.status(503).json({ ok: false, error: "Email reporting is not configured" });
  }

  const source = text(body.source, 80).replace(/[^a-zA-Z0-9_.-]/g, "-") || "client";
  const details = [
    "ENOSX AI automatic error report",
    `Occurred: ${text(body.occurredAt, 40) || new Date(now).toISOString()}`,
    `App version: ${text(body.appVersion, 32) || "unknown"}`,
    `Source: ${source}`,
    `Page: ${text(body.path, 200) || "/"}`,
    `Browser: ${text(body.userAgent, 300) || "unknown"}`,
    "",
    "Error:",
    text(body.message, 500) || "Unknown client error",
    "",
    "Stack / component context:",
    text(body.stack, 1_800) || "Not available",
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
        subject: `[ENOSX AI] Client error (${source})`,
        text: details,
      }),
    });
    if (!response.ok) {
      console.error("Error report email provider rejected the report", response.status);
      return res.status(502).json({ ok: false, error: "Could not deliver the report" });
    }
    return res.status(202).json({ ok: true });
  } catch (error) {
    console.error("Error report email delivery failed", error instanceof Error ? error.name : "unknown");
    return res.status(502).json({ ok: false, error: "Could not deliver the report" });
  }
}
