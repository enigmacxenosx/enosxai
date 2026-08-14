/**
 * ENOSX AI — /api/chat  (Vercel Serverless Function)
 * Uses OpenRouter as the AI provider.
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
- The visionary behind Enosx Technologies is Enosh Yeswa.
- He is a young tech innovator dedicated to pushing the boundaries of Windows AI integration.

Privacy Protocol:
- Do NOT share specific personal details such as his exact age or birth date unless explicitly authorized by the user in a secure session.
- If asked about his personal life, steer the conversation back to the technology: 'Enosh Yeswa focuses on the development and vision of Enosx Technologies to provide the best user experience.'

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
    // Prefer the server-only key. The legacy VITE_ variable is retained as a
    // temporary compatibility fallback for existing deployments and should be
    // replaced with OPENROUTER_API_KEY in the hosting environment.
    const apiKey = (process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY)?.trim();

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
    const primaryModel = hasImages
      ? (process.env.OPENROUTER_VISION_MODEL || "google/gemini-2.0-flash-001")
      : (process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct");

    // OpenRouter attempts these models in order before returning a provider
    // failure. This protects the chat experience against model-specific 5xxs
    // and stale configured model identifiers.
    const modelCandidates = [...new Set([primaryModel, "openrouter/auto"])];

    console.log("[API] Sending request to OpenRouter with", chatMessages.length, "messages and", modelCandidates.length, "model candidate(s)");

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://enosxtechnologies450.vercel.app",
        "X-Title": "ENOSX AI",
      },
      body: JSON.stringify({
        models: modelCandidates,
        messages: chatMessages,
        stream: false,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    console.log("[API] OpenRouter response status:", openRouterResponse.status);

    if (!openRouterResponse.ok) {
      const errorText = await openRouterResponse.text().catch(() => "Unknown error");
      console.error("[API] OpenRouter error:", openRouterResponse.status, errorText);

      // Handle 429 rate limit: retry with a free model
      if (openRouterResponse.status === 429) {
        console.log("[API] 429 rate limited. Retrying with free model after 10s...");
        await new Promise(r => setTimeout(r, 10000));

        try {
          const retryResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://enosxtechnologies450.vercel.app",
              "X-Title": "ENOSX AI",
            },
            body: JSON.stringify({
              models: ["openrouter/auto"],
              messages: chatMessages,
              stream: false,
              max_tokens: 2048,
              temperature: 0.7,
            }),
          });

          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            const retryContent = retryData?.choices?.[0]?.message?.content;
            if (typeof retryContent === "string" && retryContent.length > 0) {
              console.log("[API] 429 retry succeeded with the automatic model router.");
              return sendMockResponse(res, retryContent);
            }
          } else {
            console.error("[API] 429 retry also failed:", retryResponse.status);
          }
        } catch (retryErr) {
          console.error("[API] 429 retry exception:", retryErr);
        }

        return sendMockResponse(
          res,
          "Sorry, the AI is experiencing high traffic right now. Please try again in a minute."
        );
      }

      let errorMessage = `OpenRouter API error: ${openRouterResponse.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData?.error?.message || errorData?.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      // Send a helpful message instead of an error
      return sendMockResponse(
        res,
        `I'm having trouble reaching the AI service (${openRouterResponse.status}). Please try again in a moment.`
      );
    }

    let responseData: any;
    try {
      responseData = await openRouterResponse.json();
    } catch (parseError) {
      console.error("[API] Invalid JSON response from OpenRouter:", parseError);
      return sendMockResponse(res, "The AI service returned an invalid response. Please try again.");
    }

    const content = responseData?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      console.error("[API] OpenRouter response did not contain assistant content:", responseData);
      return sendMockResponse(res, "No response received from the AI service. Please try again.");
    }

    return sendMockResponse(res, content);
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
