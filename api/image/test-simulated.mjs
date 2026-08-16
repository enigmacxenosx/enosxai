/**
 * Simulated-request test for api/image/generate.ts.
 * Mocks the VercelRequest/VercelResponse interfaces and OpenRouter's fetch,
 * then asserts on the handler's behavior: valid response shape, failover,
 * and error codes.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Compile the TS handler on the fly with esbuild (dev dep via pnpm) if present,
// otherwise use tsx if available.
let handler;
try {
  const esbuild = await import("esbuild");
  const compiled = esbuild.buildSync({
    entryPoints: [join(__dirname, "generate.ts")],
    bundle: true,
    write: false,
    format: "esm",
    platform: "node",
    target: "node24",
    external: ["@vercel/node"],
  });
  const code = new TextDecoder().decode(compiled.outputFiles[0].contents);
  const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
  handler = mod.default;
} catch (e) {
  console.error("Compile step failed:", e.message);
  process.exit(2);
}

let assertions = 0;
function assert(cond, label) {
  assertions++;
  if (!cond) {
    console.error("ASSERT FAILED:", label);
    process.exitCode = 1;
  } else {
    console.log("  pass:", label);
  }
}

function makeReq(method, body) {
  // Simulate Vercel's pre-parsed JSON body, like the serverless runtime does.
  return { method, body };
}

function makeRes() {
  const r = {
    _status: null,
    _json: null,
    setHeader() {},
    status(s) { r._status = s; return r; },
    json(b) { r._json = b; return Promise.resolve(); },
    end() { return r; },
  };
  return r;
}

// ── Mock 1: happy path with primary model ────────────────────────────────
console.log("[test] happy path: primary model returns an image url");
console.log("[test] env OPENROUTER_API_KEY at start:", process.env.OPENROUTER_API_KEY ? "(set)" : "(MISSING)");
const originalFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (url.includes("images/generations")) {
    if (init.body.includes("google/gemini-3.1-flash-image")) {
      return new Response(JSON.stringify({ data: [{ url: "https://cdn.example.com/img.png", revised_prompt: "a cat" }] }), { status: 200 });
    }
  }
  return new Response("unexpected call", { status: 500 });
};
let res = makeRes();
await handler(makeReq("POST", { prompt: "a cat" }), res);
assert(res._status === 200, "returns 200");
assert(res._json.url === "https://cdn.example.com/img.png", "returns image url");
assert(res._json.revised_prompt === "a cat", "returns revised prompt");

// ── Mock 2: 400 on primary (invalid model) → failover to secondary ────────
console.log("[test] failover: primary 400 → secondary 200");
let calls = [];
globalThis.fetch = async (url, init) => {
  calls.push(JSON.parse(init.body).model);
  if (calls.length === 1) return new Response(JSON.stringify({ error: { message: "unknown model" } }), { status: 400 });
  if (calls.length === 2) return new Response(JSON.stringify({ data: [{ url: "https://cdn.example.com/fallback.png" }] }), { status: 200 });
  return new Response("unexpected", { status: 500 });
};
res = makeRes();
await handler(makeReq("POST", { prompt: "a cat" }), res);
assert(res._status === 200, "failover returns 200");
assert(res._json.url === "https://cdn.example.com/fallback.png", "failover returns fallback url");
assert(calls[0] === "google/gemini-3.1-flash-image" && calls[1] === "openai/gpt-5-image-mini", "tried primary then secondary");

// ── Mock 3: all candidates fail → 502 ─────────────────────────────────────
console.log("[test] all-fail: returns 502 with structured error");
globalThis.fetch = async () => new Response("down", { status: 502 });
res = makeRes();
await handler(makeReq("POST", { prompt: "a cat" }), res);
assert(res._status === 502, "returns 502");
assert(res._json.status === "GENERATION_FAILED", "structured error status");

// ── Mock 4: missing prompt → 400 ──────────────────────────────────────────
console.log("[test] missing prompt → 400");
res = makeRes();
await handler(makeReq("POST", { prompt: "" }), res);
assert(res._status === 400, "returns 400");
assert(res._json.status === "MISSING_PROMPT", "structured error status");

// ── Mock 5: GET request → 405 ─────────────────────────────────────────────
console.log("[test] wrong method → 405");
res = makeRes();
await handler(makeReq("GET"), res);
assert(res._status === 405, "returns 405");

// ── Mock 6: missing key → 503 ─────────────────────────────────────────────
console.log("[test] missing OPENROUTER_API_KEY → 503");
const savedKey = process.env.OPENROUTER_API_KEY;
delete process.env.OPENROUTER_API_KEY;
delete process.env.VITE_OPENROUTER_API_KEY;
res = makeRes();
await handler(makeReq("POST", { prompt: "a cat" }), res);
assert(res._status === 503, "returns 503 without a key");
assert(res._json.status === "CONFIGURATION_ERROR", "structured config error");
if (savedKey) process.env.OPENROUTER_API_KEY = savedKey;

// ── Mock 7: non-image payload rejected ─────────────────────────────────────
console.log("[test] non-image payload skipped → failover");
calls = [];
globalThis.fetch = async (url, init) => {
  calls.push(JSON.parse(init.body).model);
  if (calls.length === 1) {
    return new Response(JSON.stringify({ data: [{ action: "dalle.text2im", status: "completed" }] }), { status: 200 });
  }
  return new Response(JSON.stringify({ data: [{ url: "https://cdn.example.com/good.png" }] }), { status: 200 });
};
res = makeRes();
await handler(makeReq("POST", { prompt: "a cat" }), res);
assert(res._status === 200 && res._json.url === "https://cdn.example.com/good.png", "skips non-image payload and uses fallback");

globalThis.fetch = originalFetch;
console.log(`\n${assertions} assertions run.`);
process.exit(process.exitCode || 0);
