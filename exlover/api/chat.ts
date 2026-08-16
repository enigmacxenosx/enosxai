const MAX_MESSAGES = 24;
const MAX_MESSAGE_LENGTH = 5000;

const SYSTEM_PROMPT = `You are ExLover Coach, a warm, emotionally intelligent relationship coach. Your job is to help a person slow down, understand their feelings, communicate clearly, make grounded decisions, and protect their dignity.

Your approach:
- Start by reflecting the emotional signal you hear, without pretending to know the whole story.
- Separate observable facts from interpretations and fears.
- Ask at most one gentle clarifying question when it would materially help.
- Offer one or two practical next steps, including sample wording when useful.
- Center consent, mutuality, honesty, autonomy, boundaries, and repair.
- Never diagnose the user or another person, predict what someone secretly feels, or encourage manipulation, surveillance, coercion, revenge, harassment, or testing games.
- Do not provide sexual content involving anyone under 18. If age is unclear, keep the guidance non-sexual and safety-focused.
- If the user describes immediate danger, abuse, threats, stalking, self-harm, or harm to another person, prioritize immediate safety and encourage contacting local emergency services, a trusted person, or a qualified crisis/domestic-violence resource.
- Do not frame yourself as a therapist, lawyer, or emergency service.

Write in concise, humane paragraphs. Use plain language. Be supportive without being flattering or certain. The user wants clarity, not a verdict.`;

function sendJson(res: any, status: number, body: unknown) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(status).json(body);
}

function normalizeMessages(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-MAX_MESSAGES)
    .filter((message): message is { role: "user" | "assistant"; content: string } => {
      if (!message || typeof message !== "object") return false;
      const candidate = message as Record<string, unknown>;
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, MAX_MESSAGE_LENGTH),
    }))
    .filter((message) => message.content.length > 0);
}

async function callOpenRouter(apiKey: string, messages: Array<{ role: string; content: string }>) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://exlover.vercel.app",
      "X-Title": "ExLover Coach",
    },
    body: JSON.stringify({
      models: [process.env.EXLOVER_MODEL || process.env.OPENROUTER_MODEL || "openrouter/auto"],
      messages,
      stream: false,
      max_tokens: 900,
      temperature: 0.62,
    }),
  });
  return response;
}

async function callOpenAI(apiKey: string, messages: Array<{ role: string; content: string }>) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.EXLOVER_MODEL || "gpt-4o-mini",
      messages,
      max_tokens: 900,
      temperature: 0.62,
    }),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method === "OPTIONS") return sendJson(res, 200, { ok: true });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const messages = normalizeMessages(body.messages);
    if (!messages.length || messages[messages.length - 1]?.role !== "user") {
      return sendJson(res, 400, { error: "A user message is required." });
    }

    const mode = typeof body.mode === "string" ? body.mode.slice(0, 32) : "clarity";
    const modeGuidance: Record<string, string> = {
      clarity: "Focus on separating facts, feelings, needs, and assumptions.",
      communication: "Focus on calm, specific language and a conversation the user can actually have.",
      boundaries: "Focus on boundaries as the user's own clear actions, not attempts to control someone else.",
      healing: "Focus on grief, self-trust, support, and small stabilizing steps.",
    };

    const fullMessages = [
      { role: "system", content: `${SYSTEM_PROMPT}\n\nCurrent coaching lens: ${modeGuidance[mode] || modeGuidance.clarity}` },
      ...messages,
    ];

    const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
    const openAIKey = process.env.OPENAI_API_KEY?.trim();
    if (!openRouterKey && !openAIKey) {
      return sendJson(res, 503, { error: "AI provider is not configured.", code: "MISSING_PROVIDER_KEY" });
    }

    const providerResponse = openRouterKey
      ? await callOpenRouter(openRouterKey, fullMessages)
      : await callOpenAI(openAIKey!, fullMessages);

    if (!providerResponse.ok) {
      const providerError = await providerResponse.text().catch(() => "");
      console.error("[ExLover] provider error", providerResponse.status, providerError.slice(0, 500));
      return sendJson(res, 502, { error: "The coach is temporarily unavailable.", code: "PROVIDER_ERROR" });
    }

    const data = await providerResponse.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      return sendJson(res, 502, { error: "The coach returned an empty response.", code: "EMPTY_RESPONSE" });
    }

    return sendJson(res, 200, { reply: reply.trim() });
  } catch (error) {
    console.error("[ExLover] request error", error);
    return sendJson(res, 500, { error: "Something went wrong while preparing your reflection.", code: "SERVER_ERROR" });
  }
}
