const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 30_000;
const BASE_DELAY_MS = 500;
const MAX_RETRY_DELAY_MS = 4_000;

function retryDelay(response: Response, attempt: number) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    const delay = Number.isFinite(seconds)
      ? seconds * 1000
      : Date.parse(retryAfter) - Date.now();
    if (Number.isFinite(delay) && delay >= 0) return Math.min(MAX_RETRY_DELAY_MS, delay);
  }
  return Math.min(MAX_RETRY_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRetryableStatus(status: number) {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

/** Retries transient NVIDIA failures while keeping a hard timeout on each attempt. */
export async function fetchNvidiaWithRetry(endpoint: string | URL, init: RequestInit) {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let response: Response;

    try {
      response = await fetch(endpoint, { ...init, signal: controller.signal });
    } catch (error) {
      clearTimeout(timeout);
      if (attempt === MAX_ATTEMPTS - 1) throw error;
      const delay = Math.min(MAX_RETRY_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
      console.warn(`[NVIDIA] Request timed out or failed; retry ${attempt + 2}/${MAX_ATTEMPTS} in ${delay}ms.`);
      await wait(delay);
      continue;
    }
    clearTimeout(timeout);

    if (!isRetryableStatus(response.status) || attempt === MAX_ATTEMPTS - 1) return response;

    const delay = retryDelay(response, attempt);
    console.warn(`[NVIDIA] Transient HTTP ${response.status}; retry ${attempt + 2}/${MAX_ATTEMPTS} in ${delay}ms.`);
    await response.body?.cancel().catch(() => undefined);
    await wait(delay);
  }

  throw new Error("NVIDIA request failed after retrying.");
}
