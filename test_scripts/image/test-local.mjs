/**
 * Optional live smoke test for NVIDIA image generation.
 * Requires NVIDIA_API_KEY and NVIDIA_IMAGE_ENDPOINT; keys are never printed.
 */
const apiKey = process.env.NVIDIA_API_KEY?.trim();
const endpoint = process.env.NVIDIA_IMAGE_ENDPOINT?.trim();
if (!apiKey || !endpoint) {
  console.log("NVIDIA image credentials are not set — skipping live call (expected in CI).");
  process.exit(0);
}

const payload = {
  model: process.env.NVIDIA_IMAGE_MODEL || "qwen-image-edit-nvpcb-ovsl2sl",
  prompt: process.argv[2] || "test image",
  mode: "text2img",
  width: 512,
  height: 512,
  cfg_scale: 7,
  steps: 20,
};

const response = await fetch(endpoint, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

const text = await response.text();
console.log(`NVIDIA image endpoint status: ${response.status}`);
if (!response.ok) {
  console.error(text.slice(0, 500));
  process.exit(1);
}

const data = JSON.parse(text);
const image = data?.image || data?.images?.[0] || data?.data?.[0]?.url || data?.data?.[0]?.b64_json || data?.artifacts?.[0]?.base64;
if (typeof image !== "string" || image.length === 0) {
  console.error("NVIDIA response did not contain an image payload.");
  process.exit(1);
}
console.log("NVIDIA image endpoint returned an image payload.");
