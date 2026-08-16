// Tiny API proxy: forwards /api/* to the live Vercel deployment over HTTPS.
// Vite's dev/preview server expects the API on localhost:8080.
import http from "node:http";
import https from "node:https";

const TARGET = "https://enosxai.vercel.app";

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost:8080");
  const targetUrl = TARGET + url.pathname + url.search;

  const opts = {
    method: req.method,
    headers: {
      ...req.headers,
      host: new URL(TARGET).host,
    },
  };

  const proxyReq = https.request(targetUrl, opts, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    console.error("proxy error:", err.message);
    res.writeHead(502);
    res.end("proxy error");
  });

  req.pipe(proxyReq);
});

server.listen(8080, "0.0.0.0", () => console.log("api-proxy listening on :8080 ->", TARGET));
