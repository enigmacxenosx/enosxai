/**
 * Simulated-request test for api/image/generate.ts.
 * Mocks NVIDIA's image endpoint and verifies the server-side contract.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, unlinkSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const esbuild = await import("esbuild");
const compiled = esbuild.buildSync({
  entryPoints: [join(__dirname, "../../api/image/generate.ts")],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  target: "node24",
  external: ["@vercel/node", "sharp"],
});
const code = new TextDecoder().decode(compiled.outputFiles[0].contents);
const compiledPath = join(__dirname, ".tmp-image-handler.mjs");
writeFileSync(compiledPath, code);
const mod = await import(`${compiledPath}?test=${Date.now()}`);
unlinkSync(compiledPath);
const handler = mod.default;
const ONE_PIXEL_PNG = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

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
    _json: null,
    setHeader() {},
    status(status) {
      response._status = status;
      return response;
    },
    json(body) {
      response._json = body;
      return Promise.resolve();
    },
    end() {
      return response;
    },
  };
  return response;
}

const savedKey = process.env.NVIDIA_API_KEY;
const savedEndpoint = process.env.NVIDIA_IMAGE_ENDPOINT;
const savedModel = process.env.NVIDIA_IMAGE_MODEL;
process.env.NVIDIA_API_KEY = "test-nvidia-key";
process.env.NVIDIA_IMAGE_ENDPOINT = "https://nvidia.example.test/image";
process.env.NVIDIA_IMAGE_MODEL = "qwen-image-edit-nvpcb-ovsl2sl";

const originalFetch = globalThis.fetch;
let capturedRequest;
globalThis.fetch = async (url, init) => {
  capturedRequest = { url, init, payload: JSON.parse(init.body) };
  if (String(url).endsWith("/v1/images/generations")) {
    return new Response("404 page not found", { status: 404 });
  }
  if (String(url) === "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev") {
    return new Response(JSON.stringify({ artifacts: [{ base64: ONE_PIXEL_PNG }] }), { status: 200 });
  }
  return new Response(JSON.stringify({
    images: [ONE_PIXEL_PNG],
    revised_prompt: "translated PCB image",
  }), { status: 200 });
};

console.log("[test] NVIDIA happy path returns a downloadable data URL");
let res = makeRes();
await handler(makeReq("POST", { prompt: "a PCB component", image: ONE_PIXEL_PNG }), res);
assert(res._status === 200, "returns 200");
assert(res._json.url.startsWith("data:image/png;base64,"), "returns a self-contained PNG data URL");
assert(res._json.revised_prompt === "translated PCB image", "returns revised prompt");
assert(res._json.watermarked === true, "marks the response as watermarked");
assert(res._json.url.startsWith("data:image/png;base64,"), "returns the watermarked PNG");
assert(capturedRequest.url === process.env.NVIDIA_IMAGE_ENDPOINT, "uses configured NVIDIA endpoint");
assert(capturedRequest.init.headers.Authorization === "Bearer test-nvidia-key", "keeps NVIDIA auth server-side");
assert(capturedRequest.payload.model === "qwen-image-edit-nvpcb-ovsl2sl", "sends configured NVIDIA model");
assert(capturedRequest.payload.prompt === "a PCB component", "sends prompt");
assert(capturedRequest.payload.image.startsWith("data:image/png;base64,"), "normalizes raw base64 to a PNG data URL");

console.log("[test] PCB model rejects a request without an input image");
res = makeRes();
await handler(makeReq("POST", { prompt: "a PCB component" }), res);
assert(res._status === 400, "returns 400 without PCB image");
assert(res._json.status === "MISSING_IMAGE", "returns structured missing-image error");

console.log("[test] NVIDIA image-edit request preserves input image");
res = makeRes();
await handler(makeReq("POST", { prompt: "translate the style", image: "data:image/png;base64,abc" }), res);
assert(res._status === 200, "image-edit returns 200");
assert(capturedRequest.payload.image === "data:image/png;base64,abc", "sends input image");
assert(capturedRequest.payload.mode === "img2img", "selects image-edit mode");

console.log("[test] Qwen Image supports prompt-only text-to-image requests");
process.env.NVIDIA_IMAGE_ENDPOINT = "https://integrate.api.nvidia.com/v1/images/generations";
process.env.NVIDIA_IMAGE_MODEL = "qwen-image";
res = makeRes();
await handler(makeReq("POST", { prompt: "a tree at sunset" }), res);
assert(res._status === 200, "Qwen Image returns 200 without an input image");
assert(res._json.url.startsWith("data:image/png;base64,"), "Qwen image base64 response becomes a data URL");
assert(capturedRequest.url === "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.1-dev", "falls back from the retired Qwen route to hosted Flux");
assert(capturedRequest.payload.mode === "base", "sends the hosted Flux base mode");
assert(capturedRequest.payload.width === 1024 && capturedRequest.payload.height === 1024, "sends supported Flux dimensions");

console.log("[test] Qwen Image rejects attached source images with a helpful error");
res = makeRes();
await handler(makeReq("POST", { prompt: "a tree at sunset", image: "data:image/png;base64,abc" }), res);
assert(res._status === 400, "rejects image input before calling NVIDIA");
assert(res._json.status === "IMAGE_INPUT_NOT_SUPPORTED", "returns a structured unsupported-image status");

console.log("[test] NVIDIA missing configuration returns 503");
delete process.env.NVIDIA_IMAGE_ENDPOINT;
res = makeRes();
await handler(makeReq("POST", { prompt: "a cat" }), res);
assert(res._status === 503, "returns 503 without endpoint");
assert(res._json.status === "CONFIGURATION_ERROR", "returns structured configuration error");
process.env.NVIDIA_IMAGE_ENDPOINT = savedEndpoint || "https://nvidia.example.test/image";

console.log("[test] invalid method returns 405");
res = makeRes();
await handler(makeReq("GET"), res);
assert(res._status === 405, "returns 405 for GET");

globalThis.fetch = originalFetch;
if (savedKey === undefined) delete process.env.NVIDIA_API_KEY;
else process.env.NVIDIA_API_KEY = savedKey;
if (savedEndpoint === undefined) delete process.env.NVIDIA_IMAGE_ENDPOINT;
else process.env.NVIDIA_IMAGE_ENDPOINT = savedEndpoint;
if (savedModel === undefined) delete process.env.NVIDIA_IMAGE_MODEL;
else process.env.NVIDIA_IMAGE_MODEL = savedModel;

console.log(`\n${assertions} assertions run.`);
process.exit(process.exitCode || 0);
