/**
 * Optional live smoke test for NVIDIA image generation.
 * Requires NVIDIA_IMAGE_API_KEY or NVIDIA_API_KEY; keys are never printed.
 */
const apiKey = process.env.NVIDIA_IMAGE_API_KEY?.trim() || process.env.NVIDIA_API_KEY?.trim();
const endpoint = process.env.NVIDIA_IMAGE_ENDPOINT?.trim();
if (!apiKey) {
  console.log("NVIDIA image credentials are not set — skipping live call (expected in CI).");
  process.exit(0);
}
if (!endpoint) {
  console.error("Set NVIDIA_IMAGE_ENDPOINT to a deployed Stable Diffusion 3.5 Large NIM endpoint before running the live test.");
  process.exit(2);
}

const payload = {
  prompt: process.argv[2] || "test image",
  mode: "base",
  width: 1024,
  height: 1024,
  cfg_scale: 5,
  steps: 28,
  seed: 0,
};

const maxAttempts = 3;
let response;
for (let attempt = 0; attempt < maxAttempts; attempt++) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeout);
    if (attempt === maxAttempts - 1) {
      console.error(error?.name === "AbortError" ? "NVIDIA request timed out after retries." : "NVIDIA request failed after retries.");
      process.exit(1);
    }
    const delay = Math.min(4000, 500 * 2 ** attempt);
    console.warn(`NVIDIA request timed out or failed; retry ${attempt + 2}/${maxAttempts} in ${delay}ms.`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    continue;
  }
  clearTimeout(timeout);

  if (![408, 425, 429].includes(response.status) && response.status < 500) break;
  if (attempt === maxAttempts - 1) break;
  const retryAfter = response.headers.get("retry-after");
  const retrySeconds = Number(retryAfter);
  const retryDateMs = retryAfter ? Date.parse(retryAfter) - Date.now() : NaN;
  const requestedDelay = Number.isFinite(retrySeconds)
    ? retrySeconds * 1000
    : Number.isFinite(retryDateMs) && retryDateMs >= 0
      ? retryDateMs
      : 500 * 2 ** attempt;
  const delay = Math.min(4000, Math.max(0, requestedDelay));
  console.warn(`NVIDIA returned HTTP ${response.status}; retry ${attempt + 2}/${maxAttempts} in ${delay}ms.`);
  await response.body?.cancel().catch(() => undefined);
  await new Promise((resolve) => setTimeout(resolve, delay));
}

const text = await response.text();
console.log(`NVIDIA image endpoint status: ${response.status}`);
if (!response.ok) {
  console.error(response.status === 429
    ? "NVIDIA rate limit persisted after retries."
    : response.status === 408 || response.status === 504
      ? "NVIDIA request timed out."
      : "NVIDIA image generation failed; response body omitted to avoid leaking provider details.");
  process.exit(1);
}

const data = JSON.parse(text);
const image = data?.artifacts?.[0]?.base64 || data?.image || data?.images?.[0] || data?.data?.[0]?.url || data?.data?.[0]?.b64_json;
if (typeof image !== "string" || image.length === 0) {
  console.error("NVIDIA response did not contain an image payload.");
  process.exit(1);
}
console.log("NVIDIA image endpoint returned an image payload.");
