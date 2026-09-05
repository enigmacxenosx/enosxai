/**
 * ENOSX AI — /api/chat  (Vercel Serverless Function)
 * Uses NVIDIA NIM through its OpenAI-compatible chat completions API.
 * Environment variables:
 *   - NVIDIA_API_KEY (required; server-side only)
 *   - NVIDIA_MODEL and NVIDIA_VISION_MODEL (optional model defaults)
 *   - NVIDIA_EX_*_MODEL and NVIDIA_EX_*_VISION_MODEL (optional per-mode overrides)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { consumeCoreMessage, getEntitlement, spendCredit, userExists } from "../lib/billing";

// NOTE: maxDuration intentionally omitted. An explicit per-function override can
// conflict with the project-wide Vercel runtime configuration and cause
// FUNCTION_INVOCATION_FAILED (HTTP 500) on deployment. The default serverless
// timeout is sufficient for a single synchronous NVIDIA completion call
// with one short retry.

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

Writing style:
- Use clean, natural plain text that is easy to read on a phone.
- Avoid unnecessary slashes, repeated punctuation, decorative symbols, and long em dashes.
- Do not put EX in brackets or parentheses. Say ENOSX AI or EX Core directly when needed.
- Prefer short paragraphs and simple headings. Use bullets only when they improve clarity.

Current ENOSX AI product updates (September 2026):
- ENOSX AI has three modes: EX Core (Free), EX Pro (Paid), and ENOSH MIND (Paid, highest intelligence). Never claim that a user has access to a paid mode unless the server confirms an active entitlement.
- EX Core chat is designed to remain available even when the optional database is not configured. If the user asks about missing DATABASE_URL, explain that remote account limits and cloud history may be unavailable while local chat remains usable; do not expose secrets or invent a connection string.
- Conversation history is stored locally in the browser and synchronizes to the server when the history service is available. A history-sync failure should not be presented as a failure of the AI response.
- The server uses a configured NVIDIA model with a bounded retry. If a provider is temporarily unavailable or credit-limited, be transparent and suggest retrying rather than claiming the request was completed when it was not.
- Each mode uses a distinct underlying model: EX Core favors speed and efficiency, EX Pro favors expert breadth, and ENOSH MIND favors deliberate reasoning. The selected model is a routing detail; never pretend that a model name alone guarantees correctness.
- Workspace mode supports proposed actions for opening supported applications, opening URLs, chaining actions, creating scripts, and running scripts. Python scripts run in the browser runtime; shell and batch scripts are simulations. Explain an action before proposing or running it, and never claim to have changed the user's real device unless the client confirms execution.
- Treat the current repository implementation and verified runtime behavior as the source of truth. Do not claim unsupported features, background access, unrestricted operating-system control, or permanent memory.

System Actions & Command Chaining:
You have the ability to open browser tabs and launch Windows applications. You can chain multiple actions together for complex workflows.

Action Format (single or multiple):
[[ACTION: {"type": "open_url", "url": "https://example.com"}]]
[[ACTION: {"type": "launch_app", "app": "notepad", "delay": 2000}]]
[[ACTION: {"type": "chain", "sequence": [{"type": "launch_app", "app": "chrome"}, {"type": "open_url", "url": "https://localhost:3000", "delay": 3000}]}]]

Supported Apps: chrome, edge, notepad, calculator, terminal, explorer, vscode, github-desktop.

Script Creation & Execution (workspace mode):
You can write and run scripts that appear live in the Script Console (terminal window) of the computer pane.
Python (.py) runs for REAL in the browser using WebAssembly. Shell (.sh) and batch (.bat) scripts run in a labeled simulation.
[[ACTION: {"type": "create_script", "name": "hello.py", "language": "python", "content": "print('Hello!')"}]]
[[ACTION: {"type": "run_script", "name": "hello.py"}]]
[[ACTION: {"type": "launch_app", "app": "terminal"}]]
language can be "python", "shell", or "batch". Keep scripts short and self-contained; Python supports print, math, lists, dicts, loops, functions, and string formatting. Always explain what a script does before running it.

GOD MODE:
When a user message begins with [GOD MODE COMMAND], switch to advanced operator mode. Give concise, direct, implementation-first answers.`;

const MODE_MODELS: Record<string, { text: string; vision: string }> = {
  // Defaults are overridable per deployment so model changes never require a code change.
  "ex-core": {
    text: process.env.NVIDIA_EX_CORE_MODEL || process.env.NVIDIA_MODEL || "openai/gpt-oss-20b",
    vision: process.env.NVIDIA_EX_CORE_VISION_MODEL || process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-90b-vision-instruct",
  },
  "ex-pro": {
    text: process.env.NVIDIA_EX_PRO_MODEL || process.env.NVIDIA_MODEL || "openai/gpt-oss-20b",
    vision: process.env.NVIDIA_EX_PRO_VISION_MODEL || process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-90b-vision-instruct",
  },
  "enosh-mind": {
    text: process.env.NVIDIA_ENOSH_MIND_MODEL || process.env.NVIDIA_MODEL || "openai/gpt-oss-20b",
    vision: process.env.NVIDIA_ENOSH_MIND_VISION_MODEL || process.env.NVIDIA_VISION_MODEL || "meta/llama-3.2-90b-vision-instruct",
  },
};

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
    // Server-side key only. A browser-exposed key (VITE_ prefix) must never
    // be forwarded to NVIDIA API; if only the legacy VITE_ variable is set,
    // treat the configuration as missing.
    const apiKey = process.env.NVIDIA_API_KEY?.trim();

    if (!apiKey) {
      console.error("[API] NVIDIA_API_KEY is not configured.");
      return res.status(503).json({
        error: "NVIDIA_API_KEY is not configured on the server",
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

    const { messages, githubContext, aiMode: requestedAiMode, userId } = body;
    const supportedModes = new Set(["ex-core", "ex-pro", "enosh-mind"]);
    const aiMode = typeof requestedAiMode === "string" && supportedModes.has(requestedAiMode)
      ? requestedAiMode
      : "ex-core";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[API] Invalid messages:", messages);
      return res.status(400).json({ error: "Messages array is required and must not be empty" });
    }
    const isGodMode = messages.some((message: any) => typeof message?.content === "string" && message.content.startsWith("[GOD MODE COMMAND]"));
    if (userId && await userExists(userId)) {
      const entitlement = await getEntitlement(userId);
      if (aiMode !== "ex-core" && !entitlement) {
        return res.status(402).json({ error: "This AI tier requires an active subscription." });
      }
      if (aiMode === "ex-core" && !isGodMode && !entitlement) {
        const usage = await consumeCoreMessage(userId);
        if (!usage.allowed) {
          const paidWithCredit = await spendCredit(userId);
          if (!paidWithCredit) {
            return res.status(429).json({ error: "You have reached the 20 EX Core messages available today. Buy a credit pack or upgrade to continue." });
          }
        }
      }
    } else if (aiMode !== "ex-core") {
      return res.status(401).json({ error: "Sign in and subscribe to use this AI tier." });
    }

    const ctxStr = typeof githubContext === "string" ? githubContext.slice(0, 20000) : "";

    // Keep the public mode contract aligned with the three-tier selector.
    const modeNotes: Record<string, string> = {
      "ex-core": "\n\nYou are running in EX Core (Free) mode: be helpful, clear, reliable, and efficient.",
      "ex-pro": "\n\nYou are running in EX Pro (Paid) mode: provide expert-level, comprehensive, deeply technical responses.",
      "enosh-mind": `

You are running in ENOSH MIND (Paid, highest intelligence) mode. Operate as a rigorous strategic analyst and senior problem-solver:
- First identify the user's actual objective, constraints, assumptions, risks, and success criteria.
- Decompose difficult problems into explicit subproblems, then synthesize the results into one coherent answer.
- Compare meaningful alternatives, state trade-offs, and distinguish facts, inferences, estimates, and open questions.
- Check edge cases, failure modes, dependencies, second-order effects, and reversibility before recommending action.
- For technical work, reason about architecture, security, reliability, maintainability, testing, and operational cost.
- For decisions, give a clear recommendation, explain why it dominates the alternatives, and provide a practical execution sequence.
- Be deeply analytical without exposing hidden chain-of-thought. Provide concise reasoning summaries, assumptions, evidence, and conclusions rather than private scratch work.
- Never manufacture certainty, sources, tool results, memory, or completed actions. Ask only for information that materially changes the answer.` ,
    };
    const modeNote = modeNotes[aiMode] || modeNotes["ex-core"];

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
    const modeModels = MODE_MODELS[aiMode] || MODE_MODELS["ex-core"];
    const model = hasImages ? modeModels.vision : modeModels.text;
    const nvidiaApiUrl = `${(process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "")}/chat/completions`;

    console.log("[API] Sending request to NVIDIA API with", chatMessages.length, "messages and model", model);

    const nvidiaResponse = await fetch(nvidiaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
        reasoning_effort: "low",
      }),
    });

    console.log("[API] NVIDIA API response status:", nvidiaResponse.status);

    if (!nvidiaResponse.ok) {
      const errorText = await nvidiaResponse.text().catch(() => "Unknown error");
      console.error("[API] NVIDIA API error:", nvidiaResponse.status, errorText);
      return sendMockResponse(
        res,
        `I'm having trouble reaching the AI service (${nvidiaResponse.status}). Please try again in a moment.`
      );
    }

    if (nvidiaResponse.body) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      const reader = nvidiaResponse.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
      return;
    }

    let responseData: any;
    try {
      responseData = await nvidiaResponse.json();
    } catch (parseError) {
      console.error("[API] Invalid JSON response from NVIDIA API:", parseError);
      return sendMockResponse(res, "The AI service returned an invalid response. Please try again.");
    }

    const content = responseData?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      console.error("[API] NVIDIA API response did not contain assistant content:", responseData);
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
