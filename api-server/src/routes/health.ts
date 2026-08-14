import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

// Optimized speed-test endpoint for bandwidth measurement
router.get("/speed-test", (req, res) => {
  const size = parseInt(req.query.size as string) || 128 * 1024; // Default 128KB
  const clampedSize = Math.max(1024, Math.min(size, 10 * 1024 * 1024)); // 1KB to 10MB

  res.setHeader("Content-Type", "application/octet-stream");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Content-Length", clampedSize.toString());

  if (req.method === "HEAD") {
    return res.end();
  }

  const chunk = Buffer.alloc(Math.min(clampedSize, 64 * 1024), "X");
  let bytesSent = 0;

  function send() {
    while (bytesSent < clampedSize) {
      const remaining = clampedSize - bytesSent;
      const toSend = Math.min(remaining, chunk.length);
      const ok = res.write(toSend === chunk.length ? chunk : chunk.subarray(0, toSend));
      bytesSent += toSend;
      if (!ok) return;
    }
    res.end();
  }

  res.on("drain", send);
  send();
});

export default router;
