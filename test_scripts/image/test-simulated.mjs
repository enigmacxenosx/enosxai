/**
 * Simulated-request test for api/image/generate.ts.
 * Mocks NVIDIA's image endpoint and verifies the server-side contract.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const esbuild = await import("esbuild");
const compiled = esbuild.buildSync({
  entryPoints: [join(__dirname, "../../api/image/generate.ts")],
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
  return new Response(JSON.stringify({
    images: ["iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB"],
    revised_prompt: "translated PCB image",
  }), { status: 200 });
};

console.log("[test] NVIDIA happy path returns a downloadable data URL");
let res = makeRes();
await handler(makeReq("POST", { prompt: "a PCB component", image: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB" }), res);
assert(res._status === 200, "returns 200");
assert(res._json.url.startsWith("data:image/png;base64,"), "returns a self-contained PNG data URL");
assert(res._json.revised_prompt === "translated PCB image", "returns revised prompt");
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
