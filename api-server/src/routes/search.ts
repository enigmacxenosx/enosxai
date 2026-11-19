import { Router, type Request, type Response } from "express";
import { searchTavily, type TavilySearchType } from "../lib/tavily-search";

const searchRouter = Router();
const supportedTypes = new Set<TavilySearchType>(["web", "images", "videos"]);
const requestCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 12;

searchRouter.post("/media-search", async (req: Request, res: Response) => {
  const query = typeof req.body?.query === "string" ? req.body.query.trim().slice(0, 240) : "";
  const type = typeof req.body?.type === "string" && supportedTypes.has(req.body.type) ? req.body.type as TavilySearchType : null;
  if (query.length < 2 || !type) {
    res.status(400).json({ error: "Provide a search query and a supported search type." });
    return;
  }

  const ip = String(req.headers["x-forwarded-for"] || req.ip || "unknown").split(",")[0].trim().slice(0, 80);
  const now = Date.now();
  const prior = requestCounts.get(ip);
  if (prior && now - prior.windowStart < RATE_WINDOW_MS && prior.count >= MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({ error: "Search rate limit reached. Please wait and try again." });
    return;
  }
  requestCounts.set(ip, !prior || now - prior.windowStart >= RATE_WINDOW_MS ? { count: 1, windowStart: now } : { ...prior, count: prior.count + 1 });

  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Online search is not configured. Set the server-side TAVILY_API_KEY." });
    return;
  }

  try {
    const results = await searchTavily(query, type, apiKey);
    res.json({ type, results });
  } catch (error) {
    req.log?.error({ err: error instanceof Error ? error.message : "unknown" }, "Tavily search request failed");
    res.status(502).json({ error: "Online search is temporarily unavailable." });
  }
});

export default searchRouter;
