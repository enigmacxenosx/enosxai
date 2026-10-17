/**
 * Simulated-request tests for api/voice.ts.
 * Mocks NVIDIA TTS and checks both provider-specific server-side contracts.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const esbuild = await import("esbuild");
const compiled = esbuild.buildSync({
  entryPoints: [join(__dirname, "../../api/voice.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  target: "node24",
  external: ["@vercel/node"],
});
const code = new TextDecoder().decode(compiled.outputFiles[0].contents);
const mod = await import(`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`);
const handler = mod.default;

let assertions = 0;
function assert(condition, label) {
  assertions++;
  if (!condition) {
    console.error("ASSERT FAILED:", label);
    process.exitCode = 1;
  } else {
    console.log("  pass:", label);
  }
}

function makeReq(method, body) {
  return { method, body };
}

function makeRes() {
  const response = {
    _status: null,
    _body: null,
    _headers: {},
    setHeader(name, value) { response._headers[name] = value; },
    status(status) { response._status = status; return response; },
    json(body) { response._body = body; return Promise.resolve(); },
    send(body) { response._body = body; return response; },
    end() { return response; },
  };
  return response;
}

const envNames = [
  "NVIDIA_MAGPIE_TTS_API_KEY", "NVIDIA_CHATTERBOX_TTS_API_KEY",
  "NVIDIA_MAGPIE_TTS_ENDPOINT", "NVIDIA_CHATTERBOX_TTS_ENDPOINT",
  "NVIDIA_MAGPIE_TTS_VOICE", "NVIDIA_CHATTERBOX_TTS_VOICE",
  "NVIDIA_TTS_API_KEY", "NVIDIA_API_KEY", "NVIDIA_TTS_VOICE",
];
const savedEnv = Object.fromEntries(envNames.map((name) => [name, process.env[name]]));
process.env.NVIDIA_MAGPIE_TTS_API_KEY = "test-magpie-key";
process.env.NVIDIA_CHATTERBOX_TTS_API_KEY = "test-chatterbox-key";
process.env.NVIDIA_MAGPIE_TTS_ENDPOINT = "https://magpie.example.test/v1/audio/synthesize";
process.env.NVIDIA_CHATTERBOX_TTS_ENDPOINT = "https://chatterbox.example.test/v1/audio/synthesize";
process.env.NVIDIA_MAGPIE_TTS_VOICE = "Magpie-Multilingual.EN-US.Aria";
process.env.NVIDIA_CHATTERBOX_TTS_VOICE = "Chatterbox-Multilingual.en-US.Male";
delete process.env.NVIDIA_TTS_API_KEY;
delete process.env.NVIDIA_API_KEY;
delete process.env.NVIDIA_TTS_VOICE;

const originalFetch = globalThis.fetch;
let capturedRequest;
globalThis.fetch = async (url, init) => {
  capturedRequest = { url, init, form: init.body };
  return new Response(Buffer.from("RIFF0000WAVE"), {
    status: 200,
    headers: { "Content-Type": "audio/wav" },
  });
};

console.log("[test] Magpie default voice uses the dedicated Magpie key and endpoint");
let res = makeRes();
await handler(makeReq("POST", { text: "Hello from Magpie" }), res);
assert(res._status === 200, "Magpie returns 200");
assert(capturedRequest.url === process.env.NVIDIA_MAGPIE_TTS_ENDPOINT, "uses Magpie endpoint");
assert(capturedRequest.init.headers.Authorization === "Bearer test-magpie-key", "uses Magpie key server-side");
assert(capturedRequest.form.get("voice") === "Magpie-Multilingual.EN-US.Aria", "uses the configured Magpie voice");
assert(capturedRequest.form.get("text") === "Hello from Magpie", "sends normalized text");
assert(res._headers["Content-Type"] === "audio/wav", "returns WAV audio");

console.log("[test] Chatterbox uses its own key and English male speaker");
res = makeRes();
await handler(makeReq("POST", { text: "Hello from Chatterbox", provider: "chatterbox" }), res);
assert(res._status === 200, "Chatterbox returns 200");
assert(capturedRequest.url === process.env.NVIDIA_CHATTERBOX_TTS_ENDPOINT, "uses Chatterbox endpoint");
assert(capturedRequest.init.headers.Authorization === "Bearer test-chatterbox-key", "uses Chatterbox key server-side");
assert(capturedRequest.form.get("voice") === "Chatterbox-Multilingual.en-US.Male", "uses the English male speaker");

console.log("[test] Chatterbox enforces its documented 500-character limit");
res = makeRes();
await handler(makeReq("POST", { text: "x".repeat(501), provider: "chatterbox" }), res);
assert(res._status === 400, "rejects text over the Chatterbox limit");
assert(res._body.status === "TEXT_TOO_LONG", "returns structured length status");

console.log("[test] Missing Chatterbox key fails safely without calling the provider");
delete process.env.NVIDIA_CHATTERBOX_TTS_API_KEY;
res = makeRes();
await handler(makeReq("POST", { text: "hello", provider: "chatterbox" }), res);
assert(res._status === 503, "returns 503 when the provider key is missing");
assert(res._body.status === "CONFIGURATION_ERROR", "returns structured configuration status");

console.log("[test] Unknown provider and invalid method are rejected");
res = makeRes();
await handler(makeReq("POST", { text: "hello", provider: "unknown" }), res);
assert(res._status === 400, "rejects an unknown provider");
res = makeRes();
await handler(makeReq("GET"), res);
assert(res._status === 405, "rejects GET requests");

globalThis.fetch = originalFetch;
for (const [name, value] of Object.entries(savedEnv)) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

console.log(`\n${assertions} assertions run.`);
process.exit(process.exitCode || 0);
