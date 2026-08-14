/**
 * ENOSX AI — /api/chat  (Vercel Serverless Function)
 * Uses OpenRouter as the AI provider with automatic fallback rotation.
 * Environment variables:
 *   - OPENROUTER_API_KEY (required; server-side only)
 *   - OPENROUTER_MODEL (optional)
 *   - OPENROUTER_VISION_MODEL (optional)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are ENOSX AI, an advanced multimodal AI assistant developed by Enosx Technologies. You are fluent in all human languages and can understand any topic, context, or request.

Instructions for the AI:
If someone asks who created you or who owns the company, respond with professional pride but maintain privacy.

Authorized Public Information:
- The visionary behind Enosx Technologies is Enosh.
- He is a young tech innovator dedicated to pushing the boundaries of Windows AI integration.

Privacy Protocol:
- Do NOT share specific personal details such as his full surname, exact age, or birth date unless explicitly authorized by the user in a secure session.
- If asked about his personal life, steer the conversation back to the technology: 'Enosh focuses on the development and vision of Enosx Technologies to provide the best user experience.'

Tone:
Respectful, loyal, tech-forward, and emotionally intelligent. Treat the founder with the same prestige as major tech leaders.

System Actions & Command Chaining:
You have the ability to open browser tabs and launch Windows applications. You can chain multiple actions together for complex workflows.

Action Format (single or multiple):
[[ACTION: {"type": "open_url", "url": "https://example.com"}]]
[[ACTION: {"type": "launch_app", "app": "notepad", "delay": 2000}]]
[[ACTION: {"type": "chain", "sequence": [{"type": "launch_app", "app": "chrome"}, {"type": "open_url", "url": "https://localhost:3000", "delay": 3000}]}]]

Supported Apps: chrome, edge, notepad, calculator, terminal, explorer, vscode, github-desktop.

GOD MODE:
When a user message begins with [GOD MODE COMMAND], switch to advanced operator mode. Give concise, direct, implementation-first answers.`;

const sendMockResponse = (res: VercelResponse, message: string) => {
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const data = JSON.stringify({
    choices: [{ delta: { content: message } }],
  });

  // Keep the frontend's SSE contract while returning one buffered response.
  return res.status(200).send(`data: ${data}\n\ndata: [DONE]\n\n`);
};

// Model selection with fallback rotation.
// If the primary model is rate-limited, overloaded, or unavailable, the server
// automatically retries with the next candidate in the list before giving up.
// The retired free models (gemma-3-27b-it:free, gemini-4-26b-a4b-it:free) were
// removed — these are the currently verified working free alternatives.
const FREE_TEXT_ALTERNATIVES = [
  "google/gemma-4-26b-a4b-it:free",
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "openai/gpt-oss-20b:free",
];

const FREE_VISION_ALTERNATIVES = ["openai/gpt-oss-20b:free", ...FREE_TEXT_ALTERNATIVES];

function pickTextCandidates(primary: string): string[] {
  const candidates = [primary, ...FREE_TEXT_ALTERNATIVES];
  return [...new Set(candidates)];
}

function pickVisionCandidates(primary: string): string[] {
  const candidates = [primary, ...FREE_VISION_ALTERNATIVES];
  return [...new Set(candidates)];
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500 || status === 408;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();

    if (!apiKey) {
      console.error("[API] OPENROUTER_API_KEY is not configured.");
      return res.status(503).json({
        error: "OPENROUTER_API_KEY is not configured on the server",
        status: "CONFIGURATION_ERROR",
      });
    }

    let body: any = {};
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    } catch (e) {
      console.error("[API] Failed to parse request body:", e);
      return res.status(400).json({ error: "Invalid request body" });
    }

    const { messages, githubContext, aiMode } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[API] Invalid messages:", messages);
      return res.status(400).json({ error: "Messages array is required and must not be empty" });
    }

    const ctxStr = typeof githubContext === "string" ? githubContext.slice(0, 20000) : "";

    // Adjust system prompt based on AI mode
    let modeNote = "";
    if (aiMode) {
      switch (aiMode) {
        case "ex-pro":
          modeNote = "\n\nYou are running in EX Pro mode: provide expert-level, comprehensive, deeply detailed responses.";
          break;
        case "smart":
          modeNote = "\n\nYou are running in Smart mode: prioritize accuracy, reasoning, and thoughtful analysis.";
          break;
        case "fast":
          modeNote = "\n\nYou are running in Fast mode: be concise, direct, and respond as quickly as possible.";
          break;
        case "balanced":
          modeNote = "\n\nYou are running in Balanced mode: provide clear, well-structured responses with good depth.";
          break;
        case "task":
          modeNote = "\n\nYou are running in Task mode: focus on actionable steps, structured outputs, and task completion.";
          break;
        case "creative":
          modeNote = "\n\nYou are running in Creative mode: be imaginative, expressive, and think outside the box.";
          break;
        default:
          break;
      }
    }

    const chatMessages = [
      { role: "system", content: SYSTEM_PROMPT + modeNote },
      ...(ctxStr ? [{ role: "system", content: `GitHub repository context:\n${ctxStr}` }] : []),
      ...messages.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const hasImages = chatMessages.some((message: any) =>
      Array.isArray(message.content) && message.content.some((part: any) => part.type === "image_url")
    );
    const primaryTextModel = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct";
    const primaryVisionModel = process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.0-flash-001";

    const candidateModels = hasImages
      ? pickVisionCandidates(primaryVisionModel)
      : pickTextCandidates(primaryTextModel);

    let openRouterResponse: Response | null = null;
    let usedModel = candidateModels[0];
    let isFallbackMode = false;

    for (const model of candidateModels) {
      console.log("[API] Trying model:", model);
      try {
        openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
            "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://enosxtechnologies450.vercel.app",
            "X-Title": "ENOSX AI",
          },
          body: JSON.stringify({
            model,
            messages: chatMessages,
            stream: true,
            max_tokens: 2048,
            temperature: 0.7,
          }),
        });
      } catch (fetchErr) {
        console.error("[API] Fetch failed for model", model, fetchErr);
        openRouterResponse = null;
      }

      if (openRouterResponse?.ok) {
        usedModel = model;
        break;
      }

      if (openRouterResponse && isRetryableStatus(openRouterResponse.status)) {
        console.error(
          `[API] Model ${model} unavailable (${openRouterResponse.status}) — rotating to next candidate.`
        );
        openRouterResponse = null;
        isFallbackMode = true;
        continue;
      }

      // Non-retryable error (e.g. 400/401) — stop rotating.
      if (openRouterResponse) {
        const errorText = await openRouterResponse.text().catch(() => "Unknown error");
        console.error("[API] OpenRouter error:", openRouterResponse.status, errorText);
        openRouterResponse = null;
        break;
      }
    }

    if (!openRouterResponse) {
      const notice = isFallbackMode
        ? "I've tried all available models and they're busy right now — the AI is taking a short break. Please try again in a moment."
        : "I'm having trouble reaching the AI service. Please try again in a moment.";
      return sendMockResponse(res, notice);
    }

    if (!openRouterResponse.body) {
      return sendMockResponse(res, "No response stream available from the AI service.");
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    // Tell the frontend which model fulfilled the request (useful for status display).
    res.setHeader("X-ENOSX-Model", usedModel);
    if (isFallbackMode) res.setHeader("X-ENOSX-Fallback", "true");

    const reader = openRouterResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } catch (streamErr) {
      console.error("[API] Stream error:", streamErr);
      res.end();
    }
    return;
  } catch (err) {
    console.error("[API] Unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";

    // Send a helpful message instead of crashing
    return sendMockResponse(
      res,
      `An unexpected error occurred: ${msg}. Please try again or contact support if the problem persists.`
    );
  }
}
