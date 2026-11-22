/**
 * Native REST adapters for non-chat NVIDIA specialists.
 *
 * These functions are intentionally framework-neutral so Vercel handlers,
 * background jobs, and the Express adapter can share the same provider logic.
 * Credentials are read only on the server and never returned in responses.
 */

export type AdapterResult<T> = {
  ok: boolean;
  status: number;
  model: string;
  data?: T;
  error?: string;
  fallback?: boolean;
};

type JsonRecord = Record<string, unknown>;

const NVIDIA_DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_TIMEOUT_MS = 12_000;

function clean(value: unknown) {
  return typeof value === "string"
    ? value.trim().replace(/^(?:['"])(.*)(?:['"])$/, "$1").trim()
    : "";
}

export function getNvidiaApiKey() {
  const configured = clean(
    process.env.NVIDIA_API_KEYS || process.env.NVIDIA_API_KEY || process.env.VITE_NVIDIA_API_KEY,
  );
  return configured.split(/[\n,]+/).map(clean).find(Boolean) || "";
}

export function getNvidiaBaseUrl() {
  const configured = clean(process.env.NVIDIA_API_BASE_URL) || NVIDIA_DEFAULT_BASE_URL;
  return `${/^https?:\/\//i.test(configured) ? configured : `https://${configured}`}`.replace(/\/$/, "");
}

function jsonHeaders(apiKey: string, extra: Record<string, string> = {}) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    ...extra,
  };
}

async function postJson(
  url: string,
  apiKey: string,
  body: JsonRecord,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<{ status: number; payload: any; text: string }> {
  const response = await fetch(url, {
    method: "POST",
    signal: AbortSignal.timeout(timeoutMs),
    headers: jsonHeaders(apiKey),
    body: JSON.stringify(body),
  });
  const text = await response.text().catch(() => "");
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = null;
  }
  return { status: response.status, payload, text };
}

function failed<T>(model: string, status: number, text: string, fallback = false): AdapterResult<T> {
  return {
    ok: false,
    status: status || 502,
    model,
    error: text.slice(0, 500) || `HTTP ${status || 502}`,
    fallback,
  };
}

function extractChatContent(payload: any) {
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

function parseStructured(value: string): JsonRecord | null {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] || value;
  try {
    const parsed = JSON.parse(fenced);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Image generation via FLUX.1 dev/schnell, OpenRouter, then an SVG fallback. */
export async function generateFluxImage(input: { prompt: string; model?: "black-forest-labs/flux.1-dev" | "black-forest-labs/flux.1-schnell"; width?: number; height?: number }): Promise<AdapterResult<{ url: string; mediaType: string }>> {
  const prompt = input.prompt.trim().slice(0, 1_200);
  const models = input.model ? [input.model] : ["black-forest-labs/flux.1-schnell", "black-forest-labs/flux.1-dev"];
  const apiKey = getNvidiaApiKey();
  if (apiKey && prompt) {
    for (const model of models) {
      try {
        const result = await postJson(`${getNvidiaBaseUrl()}/images/generations`, apiKey, {
          model,
          prompt,
          width: Math.max(256, Math.min(1536, input.width || 1024)),
          height: Math.max(256, Math.min(1536, input.height || 1024)),
          n: 1,
          response_format: "b64_json",
        });
        const image = result.payload?.data?.[0]?.b64_json || result.payload?.data?.[0]?.url;
        if (result.status >= 200 && result.status < 300 && typeof image === "string" && image) {
          return { ok: true, status: result.status, model, data: { url: image.startsWith("data:") || image.startsWith("http") ? image : `data:image/png;base64,${image}`, mediaType: "image/png" } };
        }
      } catch {
        // Try the next configured model/provider.
      }
    }
  }

  const openRouterKey = clean(process.env.OPENROUTER_API_KEY);
  if (openRouterKey && prompt) {
    try {
      const result = await postJson(`${OPENROUTER_BASE_URL}/images/generations`, openRouterKey, {
        model: clean(process.env.OPENROUTER_IMAGE_MODEL) || "black-forest-labs/flux.1-schnell",
        prompt,
        n: 1,
        response_format: "b64_json",
      });
      const image = result.payload?.data?.[0]?.b64_json || result.payload?.data?.[0]?.url;
      if (result.status >= 200 && result.status < 300 && typeof image === "string" && image) {
        return { ok: true, status: result.status, model: "openrouter/flux.1-schnell", data: { url: image.startsWith("data:") || image.startsWith("http") ? image : `data:image/png;base64,${image}`, mediaType: "image/png" }, fallback: true };
      }
    } catch {
      // Use the deterministic SVG fallback below.
    }
  }

  const safePrompt = prompt.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&#39;" })[character] || character);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024"><rect width="1024" height="1024" fill="#111827"/><text x="512" y="480" fill="#e5e7eb" font-family="sans-serif" font-size="28" text-anchor="middle">Image fallback</text><text x="512" y="535" fill="#9ca3af" font-family="sans-serif" font-size="18" text-anchor="middle">${safePrompt.slice(0, 120)}</text></svg>`;
  return { ok: true, status: 200, model: "local/svg-fallback", data: { url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, mediaType: "image/svg+xml" }, fallback: true };
}

/** Embeddings through NVIDIA's OpenAI-compatible embeddings endpoint. */
export async function createEmbeddings(input: { input: string | string[]; model?: string }): Promise<AdapterResult<{ embeddings: unknown[] }>> {
  const apiKey = getNvidiaApiKey();
  const model = input.model || "nvidia/nemotron-3.5-embed-8b";
  if (!apiKey) return failed(model, 401, "HTTP 401: NVIDIA API key is not configured.");
  try {
    const result = await postJson(`${getNvidiaBaseUrl()}/embeddings`, apiKey, { model, input: input.input });
    const embeddings = result.payload?.data?.map((entry: any) => entry?.embedding).filter((entry: unknown) => Array.isArray(entry)) || [];
    return embeddings.length && result.status >= 200 && result.status < 300
      ? { ok: true, status: result.status, model, data: { embeddings } }
      : failed(model, result.status, result.text);
  } catch (error) {
    return failed(model, 502, error instanceof Error ? error.message : "Embedding request failed.");
  }
}

/** Document ranking through the NVIDIA reranking endpoint. */
export async function rerankDocuments(input: { query: string; documents: string[]; model?: string }): Promise<AdapterResult<{ results: unknown[] }>> {
  const apiKey = getNvidiaApiKey();
  const model = input.model || "nvidia/nemotron-3.5-rerank-8b";
  if (!apiKey) return failed(model, 401, "HTTP 401: NVIDIA API key is not configured.");
  try {
    const result = await postJson(`${getNvidiaBaseUrl()}/ranking`, apiKey, { model, query: input.query, passages: input.documents.map((text) => ({ text })) });
    const results = Array.isArray(result.payload?.rankings) ? result.payload.rankings : Array.isArray(result.payload?.results) ? result.payload.results : [];
    return results.length && result.status >= 200 && result.status < 300
      ? { ok: true, status: result.status, model, data: { results } }
      : failed(model, result.status, result.text);
  } catch (error) {
    return failed(model, 502, error instanceof Error ? error.message : "Reranking request failed.");
  }
}

async function multimodalStructured(input: { model: string; prompt: string; image?: string; fallbackModel: string }): Promise<AdapterResult<JsonRecord>> {
  const apiKey = getNvidiaApiKey();
  if (!apiKey) return failed(input.model, 401, "HTTP 401: NVIDIA API key is not configured.");
  const content: unknown[] = [{ type: "text", text: input.prompt.slice(0, 8_000) }];
  if (input.image) content.push({ type: "image_url", image_url: { url: input.image, detail: "auto" } });
  const request = { model: input.model, messages: [{ role: "user", content }], temperature: 0, max_tokens: 1_200, response_format: { type: "json_object" } };
  try {
    let result = await postJson(`${getNvidiaBaseUrl()}/chat/completions`, apiKey, request);
    let contentText = extractChatContent(result.payload);
    if (!(result.status >= 200 && result.status < 300 && contentText)) {
      result = await postJson(`${getNvidiaBaseUrl()}/chat/completions`, apiKey, { ...request, model: input.fallbackModel });
      contentText = extractChatContent(result.payload);
      if (result.status >= 200 && result.status < 300 && contentText) {
        const parsed = parseStructured(contentText);
        return parsed ? { ok: true, status: result.status, model: input.fallbackModel, data: parsed, fallback: true } : failed(input.fallbackModel, 502, "Fallback model returned invalid JSON.", true);
      }
    }
    const parsed = parseStructured(contentText);
    return parsed && result.status >= 200 && result.status < 300
      ? { ok: true, status: result.status, model: input.model, data: parsed }
      : failed(input.model, result.status, result.text);
  } catch (error) {
    return failed(input.model, 502, error instanceof Error ? error.message : "Structured multimodal request failed.");
  }
}

export function parseDocument(input: { text?: string; image?: string }) {
  return multimodalStructured({ model: "nvidia/nemotron-3.5-parse", prompt: `Parse this document into structured JSON. Preserve headings, paragraphs, tables, and fields.\n${input.text || ""}`, image: input.image, fallbackModel: "nvidia/nemotron-3.5-super-vl-120b-a12b" });
}

export function runOcr(input: { image: string }) {
  return multimodalStructured({ model: "nvidia/nemoretriever-ocr", prompt: "Extract all visible text and return JSON with pages, blocks, text, confidence, and bounding boxes.", image: input.image, fallbackModel: "nvidia/nemotron-3.5-super-vl-120b-a12b" });
}

export function detectGraphicLayout(input: { image: string }) {
  return multimodalStructured({ model: "nvidia/nemotron-graphic-elements-v1", prompt: "Detect graphic elements and layout regions. Return JSON with elements, labels, bounding boxes, and reading order.", image: input.image, fallbackModel: "nvidia/nemotron-3.5-super-vl-120b-a12b" });
}

export function detectOcrV2(input: { image: string }) {
  return multimodalStructured({ model: "nvidia/nemotron-ocr-v2", prompt: "Perform high-accuracy OCR and return structured JSON with text blocks and coordinates.", image: input.image, fallbackModel: "nvidia/nemotron-3.5-super-vl-120b-a12b" });
}

function localPiiFallback(text: string): JsonRecord {
  const matches = text.match(/\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b|\b(?:\+?\d[\d ()-]{7,}\d)\b|\b\d{3}-\d{2}-\d{4}\b/g) || [];
  return { entities: matches.map((value) => ({ type: value.includes("@") ? "EMAIL" : "PHONE_OR_ID", value, start: text.indexOf(value), end: text.indexOf(value) + value.length })) };
}

export async function detectPii(input: { text: string }): Promise<AdapterResult<JsonRecord>> {
  const primary = await multimodalStructured({ model: "fastino/gliner2-pii", prompt: `Detect PII and return JSON with entities, type, start, end, and confidence.\n${input.text.slice(0, 12_000)}`, fallbackModel: "meta/llama-3.1-nemotron-safety-guard-8b-v3" });
  if (primary.ok) return primary;
  return { ok: true, status: 200, model: "local/pii-regex-fallback", data: localPiiFallback(input.text), fallback: true };
}

export async function detectSyntheticVideo(input: { frames: string[]; metadata?: JsonRecord }): Promise<AdapterResult<JsonRecord>> {
  const prompt = `Assess whether these video frames are synthetic. Return JSON with isSynthetic, confidence, signals, and explanation. Metadata: ${JSON.stringify(input.metadata || {})}`;
  const primary = await multimodalStructured({ model: "nvidia/synthetic-video-detector", prompt, image: input.frames[0], fallbackModel: "nvidia/cosmos-reason2-8b" });
  if (primary.ok) return primary;
  return { ok: true, status: 200, model: "local/synthetic-video-review-fallback", data: { isSynthetic: null, confidence: 0, signals: [], explanation: "The detector service was unavailable; manual review is required." }, fallback: true };
}

export const NVIDIA_MODALITY_ADAPTERS = {
  image: generateFluxImage,
  embeddings: createEmbeddings,
  rerank: rerankDocuments,
  parseDocument,
  ocr: runOcr,
  ocrV2: detectOcrV2,
  graphicLayout: detectGraphicLayout,
  pii: detectPii,
  syntheticVideo: detectSyntheticVideo,
} as const;
