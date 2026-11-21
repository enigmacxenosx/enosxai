import type { VercelRequest, VercelResponse } from "@vercel/node";

const MAX_QUERY_LENGTH = 240;
type TavilySearchType = "web" | "images" | "videos" | "music";
const allowedTypes = new Set<TavilySearchType>(["web", "images", "videos", "music"]);
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

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
  const type = typeof body?.type === "string" && allowedTypes.has(body.type) ? body.type as TavilySearchType : null;
  if (query.length < 2 || !type) {
    return res.status(400).json({ error: "Provide a search query and a supported search type." });
  }

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const prior = requestCounts.get(ip);
  if (prior && now - prior.windowStart < RATE_WINDOW_MS && prior.count >= MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: "Search rate limit reached. Please wait and try again." });
  }
  requestCounts.set(ip, !prior || now - prior.windowStart >= RATE_WINDOW_MS ? { count: 1, windowStart: now } : { ...prior, count: prior.count + 1 });

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return res.status(503).json({ error: "Online search is not configured. Set the server-side TAVILY_API_KEY." });

  try {
    const { searchTavily } = await import("../api-server/src/lib/tavily-search.js");
    const results = await searchTavily(query, type, apiKey);
    return res.status(200).json({ type, results });
  } catch (error) {
    console.error("Tavily search request failed", error instanceof Error ? error.message : "unknown");
    return res.status(502).json({ error: "Online search is temporarily unavailable." });
  }
}
