import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { url } = req;
  
  if (url?.includes('/healthz')) {
    return res.status(200).json({ status: 'ok' });
  }

  if (url?.includes('/speed-test')) {
    const size = parseInt(req.query.size as string) || 128 * 1024;
    const clampedSize = Math.max(1024, Math.min(size, 5 * 1024 * 1024)); // Limit to 5MB for serverless

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Content-Length', clampedSize.toString());

    if (req.method === 'HEAD') {
      return res.end();
    }

    const chunk = Buffer.alloc(Math.min(clampedSize, 64 * 1024), 'X');
    let bytesSent = 0;

    while (bytesSent < clampedSize) {
      const remaining = clampedSize - bytesSent;
      const toSend = Math.min(remaining, chunk.length);
      res.write(toSend === chunk.length ? chunk : chunk.subarray(0, toSend));
      bytesSent += toSend;
    }
    return res.end();
  }

  return res.status(404).json({ error: 'Not found' });
}
