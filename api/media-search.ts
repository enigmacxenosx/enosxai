import type { VercelRequest, VercelResponse } from "@vercel/node";

const MAX_QUERY_LENGTH = 240;
const allowedTypes = new Set(["images", "videos"]);
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

type SearchResult = { title: string; url: string; imageUrl?: string; source?: string };

function safePublicUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000) return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanText(value: unknown, max = 200): string {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max) : "";
}

function isAllowedOrigin(value: string): boolean {
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
    return res.status(405).json({ error: "Method not allowed" });
  }
  const origin = req.headers.origin;
  if (typeof origin !== "string" || !isAllowedOrigin(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }

  const body = typeof req.body === "string" ? (() => { try { return JSON.parse(req.body); } catch { return null; } })() : req.body;
  const query = typeof body?.query === "string" ? body.query.trim().slice(0, MAX_QUERY_LENGTH) : "";
  const type = typeof body?.type === "string" ? body.type : "";
  if (query.length < 2 || !allowedTypes.has(type)) {
    return res.status(400).json({ error: "Provide a search query and a supported media type." });
  }

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const prior = requestCounts.get(ip);
  if (prior && now - prior.windowStart < RATE_WINDOW_MS && prior.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: "Media search rate limit reached. Please wait and try again." });
  }
  requestCounts.set(ip, !prior || now - prior.windowStart >= RATE_WINDOW_MS ? { count: 1, windowStart: now } : { ...prior, count: prior.count + 1 });

  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Online media search is not configured." });

  try {
    const response = await fetch(`https://google.serper.dev/${type}`, {
      method: "POST",
      signal: AbortSignal.timeout(12_000),
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, num: 6 }),
    });
    if (!response.ok) {
      console.error("Serper media search failed", response.status);
      return res.status(502).json({ error: "Online media search is temporarily unavailable." });
    }
    const data = await response.json() as Record<string, unknown>;
    const rows = Array.isArray(data[type]) ? data[type] as Record<string, unknown>[] : [];
    const results: SearchResult[] = rows.slice(0, 6).flatMap((row) => {
      const url = safePublicUrl(type === "images" ? row.link : row.link || row.url);
      if (!url) return [];
      const title = cleanText(row.title, 180) || (type === "images" ? "Online image" : "Online video");
      const imageUrl = type === "images" ? safePublicUrl(row.imageUrl || row.imageUrlLarge || row.thumbnailUrl) || undefined : undefined;
      const source = cleanText(row.source, 100) || undefined;
      return [{ title, url, ...(imageUrl ? { imageUrl } : {}), ...(source ? { source } : {}) }];
    });
    return res.status(200).json({ type, results });
  } catch (error) {
    console.error("Serper media search request failed", error instanceof Error ? error.name : "unknown");
    return res.status(502).json({ error: "Online media search is temporarily unavailable." });
  }
}
