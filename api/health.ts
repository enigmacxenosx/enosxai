// Vercel Serverless Function: GET /api/health | /api/healthz | /api/speed-test
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url || "";
  if (path.includes("/healthz") || path === "/api/health") {
    return res.status(200).json({ status: "ok", timestamp: Date.now() });
  }
  if (path.includes("/speed-test")) {
    const size = Math.max(1024, Math.min(parseInt(req.query.size as string) || 128 * 1024, 5 * 1024 * 1024));
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Length", String(size));
    if (req.method === "HEAD") return res.end();
    const chunk = Buffer.alloc(Math.min(size, 64 * 1024), "X");
    let sent = 0;
    while (sent < size) {
      const toSend = Math.min(size - sent, chunk.length);
      res.write(toSend === chunk.length ? chunk : chunk.subarray(0, toSend));
      sent += toSend;
    }
    return res.end();
  }
  return res.status(404).json({ error: "Not found" });
}
