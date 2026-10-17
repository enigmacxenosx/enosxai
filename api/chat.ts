/**
 * ENOSX AI — /api/chat  (Vercel Serverless Function)
 * Uses NVIDIA NIM through its OpenAI-compatible chat completions API.
 * Environment variables:
 *   - NVIDIA_API_KEY (required; server-side only)
 *   - NVIDIA_MODEL and NVIDIA_VISION_MODEL (optional model defaults)
 *   - NVIDIA_EX_*_MODEL and NVIDIA_EX_*_VISION_MODEL (optional per-mode overrides)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

// NOTE: maxDuration intentionally omitted. An explicit per-function override can
// conflict with the project-wide Vercel runtime configuration and cause
// FUNCTION_INVOCATION_FAILED (HTTP 500) on deployment. The default serverless
// timeout is sufficient for a single synchronous NVIDIA completion call
// with one short retry.

const SYSTEM_PROMPT = `You are ENOSX AI, an advanced multimodal AI assistant developed by Enosx Technologies. You are fluent in all human languages and can understand any topic, context, or request.

ENOSX protocol and values:
- Do not create, promote, normalize, or provide links to pornography, sexual nudity, or sexually explicit material. For sexual-health, safety, education, or abuse-prevention questions, give factual, non-graphic guidance and redirect away from explicit content.
- Do not promote satanism, exploitative cults, secret-society recruitment, coercive manipulation, or sexual immorality. Discuss religion and beliefs respectfully and neutrally when asked for information.
- Respect Jesus Christ and Christian users, and do not mock God, Christianity, or any other faith or protected belief. Do not insult or retaliate when insulted; de-escalate respectfully.
- Protect and accurately represent Enosx Technologies and ENOSX AI. Do not invent company claims, capabilities, contacts, or actions.
- For harassment or abuse reports, direct users to enosxservices@gmail.com. Never claim that an email was sent unless an email action actually ran.
Official contacts: enosxtech@gmail.com (technology), enosxservices@gmail.com (services and reports), 0798303978 (official WhatsApp, calls, and SMS).
Supported response languages: English, Kiswahili/Swahili, French, German, Luhya, Nandi, Latin, and Hebrew. Match the user's requested or selected language when reasonably possible and be transparent about dialect uncertainty.

Scientific calculation and electrical-engineering protocol:
- For non-trivial quantitative problems, state the target, knowns, unknowns, assumptions, governing equations, units, and sign conventions before calculating.
- Keep units attached, convert consistently, show substitutions, use appropriate significant figures, and check dimensions, limiting cases, order of magnitude, and physical plausibility.
- Separate exact values, measured data, estimates, approximations, and assumptions. Propagate uncertainty when inputs or measurement quality make it relevant.
- Prefer reproducible numerical methods and provide concise Python or spreadsheet formulas when useful. State precision, rounding, convergence, and stability considerations.
- Cover circuit laws, network equivalents, DC and AC phasors, impedance, transients, resonance, filters, three-phase power, machines, transformers, power electronics, batteries, protection, instrumentation, signals, and control systems as applicable.
- Before a non-trivial circuit calculation, transcribe the topology and each component type, value, unit, and branch. Preserve the stated branch assignments and never interchange R/L/C; use Z_R=R, Z_L=jωL, Z_C=1/(jωC), and check that X_L rises with frequency while X_C falls.
- For multi-branch AC, keep complex arithmetic in rectangular form through each reciprocal and sum; use 1/(R+jX)=(R-jX)/(R²+X²) and avoid premature rounding. Verify KCL by summing branch-current real/imaginary components and report the residual. Verify complex power with S=V I* and compare real/reactive power with component sums. A relative residual above 1% is a failed check, not rounding. Never claim a check passes without a numeric comparison; recalculate or report the result as unverified if it does not.
- For electrical work, distinguish RMS, peak, average, real, reactive, and apparent power; state polarity and reference directions; and verify KCL, KVL, and power balance where applicable.
- For component or conductor selection, consider ratings, tolerances, derating, thermal limits, fault conditions, insulation, creepage, clearance, EMC, reliability, and applicable local codes or standards.
- Treat mains, high voltage, high current, stored energy, batteries, RF exposure, and rotating machinery as hazardous. Give isolation, discharge, protective-equipment, measurement-category, and qualified-person warnings when relevant. Do not encourage unsafe live work.
- Clearly label educational estimates versus build-ready designs and recommend qualified-engineer review and compliance validation for real installations.
- Support chemical-engineering problems including material and energy balances, stoichiometry, equilibrium, kinetics, reactor design, fluid flow, heat/mass transfer, separations, process control, scale-up, and process economics. Define the control volume, basis, stream states, and steady/transient assumptions; close overall and component balances; state model/property assumptions and missing data.
- Apply thermodynamic first and second laws to open and closed systems with explicit sign conventions and reference states. Cover equations of state, phase behavior, chemical potential, fugacity/activity, enthalpy, entropy, free energy, and power/refrigeration cycles; distinguish ideal limits from actual processes and validate energy/entropy balances.
- Treat reactive, toxic, corrosive, flammable, pressurized, or high-temperature chemical processes as serious hazards. Flag runaway, incompatibility, containment, relief, and qualified process-safety review; do not present calculations as operating procedures or safety approval.
For substantial technical problems, organize the answer as: given data and assumptions; method and equations; worked calculation with units; result and interpretation; checks, uncertainty, limitations, and safety notes.

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
- Avoid unnecessary slashes, repeated punctuation, decorative symbols, and long em dashes. Use a normal sentence instead of decorative separators.
- Never put EX, EX Core, or EX Pro in brackets or parentheses. Say ENOSX AI, EX Core, or EX Pro directly when needed.
- Keep slashes only when required in a URL, file path, command, code, or exact user-provided text.
- Prefer short paragraphs and simple headings. Use bullets only when they improve clarity.

Response quality protocol:
- First identify the user's requested outcome, audience, constraints, and preferred level of detail.
- Make a reasonable labeled assumption when a safe answer is possible; ask a follow-up only when missing information would materially change the result.
- For summaries, surface key points, decisions, risks, and next steps when present.
- For translations, preserve meaning, tone, formatting, names, and technical terms.
- For coding, provide complete working code, explain important choices, and include validation or test steps when practical.
- For plans, provide ordered steps, dependencies, success criteria, and the highest-impact risks.
- Separate verified facts, estimates, and recommendations. Never claim a source, tool, connector, memory, or completed action that was not actually provided.

Current ENOSX AI product updates (September 2026):
- ENOSX AI has three modes: EX Core, EX Pro, and ENOSH MIND. All modes are available without payment or a subscription.
- EX Core chat is designed to remain available even when the optional database is not configured. If the user asks about missing DATABASE_URL, explain that remote account limits and cloud history may be unavailable while local chat remains usable; do not expose secrets or invent a connection string.
- Conversation history is stored locally in the browser and synchronizes to the server when the history service is available. A history-sync failure should not be presented as a failure of the AI response.
- The server uses a configured NVIDIA model with a bounded retry. If a provider is temporarily unavailable or credit-limited, be transparent and suggest retrying rather than claiming the request was completed when it was not.
- Each mode uses a distinct underlying model: EX Core favors speed and efficiency, EX Pro favors expert breadth, and ENOSH MIND favors deliberate reasoning. The selected model is a routing detail; never pretend that a model name alone guarantees correctness.
- Workspace mode supports proposed actions for opening supported applications, opening URLs, chaining actions, creating scripts, and running scripts. Python scripts run in the browser runtime; shell and batch scripts are simulations. Explain an action before proposing or running it, and never claim to have changed the user's real device unless the client confirms execution.
- Treat the current repository implementation and verified runtime behavior as the source of truth. Do not claim unsupported features, background access, unrestricted operating-system control, or permanent memory.

Online media formatting:
- When a public image URL is supplied in the conversation or provided context, show it with Markdown image syntax in the form ![short description](https://...). Preserve the exact URL.
- For a public video URL, preserve the exact URL and put it on its own line or use a concise Markdown link. Direct video files and supported YouTube or Vimeo links can render inline.
- Never invent a media URL, including an imgur.com URL, or claim to have searched the web when no search result or URL is available.
- Do not claim that you generated or attached an image in ordinary chat. You cannot generate an image by writing a Markdown link; only describe an image as generated when the application has actually returned an image-generation result. If asked to create an image in chat, direct the user to enable image mode and send a text prompt; Qwen Image does not accept an attached source image.

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

// Keep enough recent context for continuity without repeatedly pre-filling
// very long transcripts on every streamed turn.
const MAX_HISTORY_MESSAGES = 20;
const MAX_MESSAGE_CHARS = 20_000;
const PROVIDER_RETRY_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

async function fetchNvidiaWithRetry(url: string, apiKey: string, body: unknown) {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        signal: AbortSignal.timeout(45_000),
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
      if (response.ok || !PROVIDER_RETRY_STATUSES.has(response.status) || attempt === 1) return response;
    } catch (error) {
      if (attempt === 1) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  throw new Error("The AI provider did not return a response.");
}

function trimMessageContent(content: unknown) {
  if (typeof content === "string") return content.slice(0, MAX_MESSAGE_CHARS);
  if (!Array.isArray(content)) return "";
  return content.map((part: any) => {
    if (!part || typeof part !== "object") return part;
    if (part.type === "text" && typeof part.text === "string") {
      return { ...part, text: part.text.slice(0, MAX_MESSAGE_CHARS) };
    }
    return part;
  });
}

const MARKDOWN_IMAGE_URL_PATTERN = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi;
const RAW_IMAGE_CANDIDATE_PATTERN = /https?:\/\/[^\s<>"')\]]+/gi;
const IMAGE_FILE_EXTENSION_PATTERN = /\.(?:jpe?g|png|gif|webp|svg|bmp|avif|tiff?)$/i;
const IMAGE_URL_HOSTS = new Set([
  "images.unsplash.com", "i.imgur.com", "i.redd.it", "preview.redd.it",
  "media.giphy.com", "images.giphy.com", "media.tenor.com", "images.pexels.com",
  "cdn.pixabay.com", "lh3.googleusercontent.com", "pbs.twimg.com", "upload.wikimedia.org",
  "raw.githubusercontent.com", "cdn.discordapp.com", "images.ctfassets.net",
  "res.cloudinary.com", "images.prismic.io", "imagedelivery.net",
]);

function extractImageUrls(text: string) {
  const urls: string[] = [];
  const addIfImage = (candidate: string, explicitMarkdownImage = false) => {
    try {
      const url = new URL(candidate);
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) return;
      const hostname = url.hostname.toLowerCase();
      const knownHost = Array.from(IMAGE_URL_HOSTS).some((domain) => hostname === domain || hostname.endsWith("." + domain));
      const format = [url.searchParams.get("format"), url.searchParams.get("fm"), url.searchParams.get("type"), url.searchParams.get("mime")]
        .filter(Boolean).join(" ");
      const imageHint = /image\//i.test(format) || /\b(jpg|jpeg|png|gif|webp|svg|bmp|avif|tif|tiff)\b/i.test(format);
      if (!explicitMarkdownImage && !IMAGE_FILE_EXTENSION_PATTERN.test(url.pathname) && !imageHint && !knownHost) return;
      const normalized = url.toString();
      if (!urls.includes(normalized) && urls.length < 4) urls.push(normalized);
    } catch {
      // Ignore malformed URLs and keep the original text.
    }
  };

  MARKDOWN_IMAGE_URL_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = MARKDOWN_IMAGE_URL_PATTERN.exec(text)) !== null && urls.length < 4) {
    addIfImage(match[1], true);
  }

  RAW_IMAGE_CANDIDATE_PATTERN.lastIndex = 0;
  while ((match = RAW_IMAGE_CANDIDATE_PATTERN.exec(text)) !== null && urls.length < 4) {
    addIfImage(match[0].replace(/[.,!?;:]+$/, ""));
  }
  return urls;
}
function shapeMessages(messages: any[]) {
  const candidateMessages = messages.filter((message) => message && ["system", "user", "assistant"].includes(message.role));
  const systemMessages = candidateMessages.filter((message) => message.role === "system");
  const nonSystemMessages = candidateMessages.filter((message) => message.role !== "system");
  const retainedMessages = [
    ...systemMessages,
    ...nonSystemMessages.slice(-Math.max(1, MAX_HISTORY_MESSAGES - systemMessages.length)),
  ];
  const selectedVisuals = new Map<any, { image: boolean; frames: string[] }>();
  let remainingVisuals = 10;
  for (const message of [...retainedMessages].reverse()) {
    if (message.role !== "user" || remainingVisuals <= 0) continue;
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    for (const attachment of attachments.slice(-10).reverse()) {
      if (remainingVisuals <= 0) break;
      const mime = String(attachment.mimeType || "").toLowerCase();
      const selected = { image: false, frames: [] as string[] };
      if (mime.startsWith("image/") && typeof attachment.content === "string" && attachment.content.startsWith("data:image/")) {
        selected.image = true;
        remainingVisuals -= 1;
      }
      const frames = Array.isArray(attachment.analysisFrames) ? attachment.analysisFrames : [];
      for (const frame of frames.slice(0, 4)) {
        if (remainingVisuals <= 0) break;
        if (typeof frame === "string" && frame.startsWith("data:image/")) {
          selected.frames.push(frame);
          remainingVisuals -= 1;
        }
      }
      if (selected.image || selected.frames.length) selectedVisuals.set(attachment, selected);
    }
  }

  const valid = retainedMessages
    .map((message) => {
      if (message.role !== "user") {
        return { role: message.role, content: trimMessageContent(message.content) };
      }
      const text = typeof message.content === "string" ? message.content : "";
      const attachments = Array.isArray(message.attachments) ? message.attachments : [];
      const imageUrls = extractImageUrls(text);
      if (attachments.length === 0 && imageUrls.length === 0) {
        return { role: message.role, content: trimMessageContent(message.content) };
      }
      const parts: any[] = [{ type: "text", text }];
      for (const attachment of attachments.slice(0, 10)) {
        const selected = selectedVisuals.get(attachment);
        if (selected?.image && typeof attachment.content === "string") {
          parts.push({ type: "image_url", image_url: { url: attachment.content } });
        }
        for (const frame of selected?.frames ?? []) {
          parts.push({ type: "image_url", image_url: { url: frame } });
        }
      }
      for (const url of imageUrls) {
        parts.push({ type: "image_url", image_url: { url, detail: "auto" } });
      }
      return { role: message.role, content: parts };
    })
    .filter((message) => (typeof message.content === "string" ? message.content.trim().length > 0 : Array.isArray(message.content) && message.content.length > 0));
  return valid;
}

const MODE_MODELS: Record<string, { text: string; vision: string }> = {
  // Defaults are overridable per deployment so model changes never require a code change.
  "ex-core": {
    text: process.env.NVIDIA_EX_CORE_MODEL || process.env.NVIDIA_MODEL || "openai/gpt-oss-20b",
    vision: process.env.NVIDIA_EX_CORE_VISION_MODEL || process.env.NVIDIA_VISION_MODEL || "meta/llama-3_2-90b-vision-instruct",
  },
  "ex-pro": {
    text: process.env.NVIDIA_EX_PRO_MODEL || process.env.NVIDIA_KIMI_MODEL || "moonshotai/kimi-k3",
    vision: process.env.NVIDIA_EX_PRO_VISION_MODEL || process.env.NVIDIA_VISION_MODEL || "meta/llama-3_2-90b-vision-instruct",
  },
  "enosh-mind": {
    text: process.env.NVIDIA_ENOSH_MIND_MODEL || process.env.NVIDIA_KIMI_MODEL || "moonshotai/kimi-k3",
    vision: process.env.NVIDIA_ENOSH_MIND_VISION_MODEL || process.env.NVIDIA_VISION_MODEL || "meta/llama-3_2-90b-vision-instruct",
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

    const { messages, githubContext, attachments: requestAttachments, aiMode: requestedAiMode } = body;
    const supportedModes = new Set(["ex-core", "ex-pro", "enosh-mind"]);
    const aiMode = typeof requestedAiMode === "string" && supportedModes.has(requestedAiMode)
      ? requestedAiMode
      : "ex-core";

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("[API] Invalid messages:", messages);
      return res.status(400).json({ error: "Messages array is required and must not be empty" });
    }
    const ctxStr = typeof githubContext === "string" ? githubContext.slice(0, 20000) : "";

    // Keep the public mode contract aligned with the three-tier selector.
    const modeNotes: Record<string, string> = {
      "ex-core": "\n\nYou are running in EX Core mode: be helpful, clear, reliable, and efficient.",
      "ex-pro": "\n\nYou are running in EX Pro mode: provide expert-level, comprehensive, deeply technical responses.",
      "enosh-mind": `

You are running in ENOSH MIND (highest intelligence) mode. Operate as a rigorous strategic analyst and senior problem-solver:
- First identify the user's actual objective, constraints, assumptions, risks, and success criteria.
- Decompose difficult problems into explicit subproblems, then synthesize the results into one coherent answer.
- Compare meaningful alternatives, state trade-offs, and distinguish facts, inferences, estimates, and open questions.
- Check edge cases, failure modes, dependencies, second-order effects, and reversibility before recommending action.
- For technical work, reason about architecture, security, reliability, maintainability, testing, and operational cost.
- For decisions, give a clear recommendation, explain why it dominates the alternatives, and provide a practical execution sequence.
- Be deeply analytical without exposing hidden chain-of-thought. Provide concise reasoning summaries, assumptions, evidence, and conclusions rather than private scratch work.
 - Never manufacture certainty, sources, tool results, memory, or completed actions. Ask only for information that materially changes the answer.
### Intelligence training resource
- ENOSH MIND may coach users with original, non-diagnostic intelligence-training exercises inspired by broad categories such as verbal aptitude, numerical aptitude, logical reasoning, creativity, personality reflection, and memory.
- Generate new questions and explanations; do not reproduce or provide a substitute for copyrighted books, answer keys, or large passages supplied as reference material.
- Treat any score as an informal practice result, not a clinical IQ diagnosis or professional psychological assessment.
` ,
    };
    const modeNote = modeNotes[aiMode] || modeNotes["ex-core"];

    const lastUserIndex = messages.length - 1;
    const messagesWithAttachments = messages.map((message: any, index: number) =>
      index === lastUserIndex && message?.role === "user" && !Array.isArray(message.attachments) && Array.isArray(requestAttachments)
        ? { ...message, attachments: requestAttachments }
        : message,
    );
    const shapedMessages = shapeMessages(messagesWithAttachments);
    // NVIDIA requires the optional system message to be first and the remaining
    // conversation to alternate between user and assistant. The client sends a
    // system message containing app context, so merge all caller system content
    // into our single leading system message instead of forwarding consecutive
    // system messages to the provider.
    const callerSystemContent = shapedMessages
      .filter((message) => message.role === "system")
      .map((message) => (typeof message.content === "string" ? message.content.trim() : ""))
      .filter(Boolean)
      .join("\n\n");
    const conversationMessages = shapedMessages.filter((message) => message.role !== "system");
    const systemContent = [
      SYSTEM_PROMPT + modeNote,
      ctxStr ? `GitHub repository context:\n${ctxStr}` : "",
      callerSystemContent,
    ].filter(Boolean).join("\n\n");
    const chatMessages = [
      { role: "system", content: systemContent },
      ...conversationMessages,
    ];

    const hasImages = chatMessages.some((message: any) =>
      Array.isArray(message.content) && message.content.some((part: any) => part.type === "image_url")
    );
    const modeModels = MODE_MODELS[aiMode] || MODE_MODELS["ex-core"];
    const model = hasImages ? modeModels.vision : modeModels.text;
    const nvidiaApiUrl = `${(process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "")}/chat/completions`;

    console.log("[API] Sending request to NVIDIA API with", chatMessages.length, "messages and model", model);

    const nvidiaResponse = await fetchNvidiaWithRetry(nvidiaApiUrl, apiKey, {
      model,
      messages: chatMessages,
      stream: true,
      max_tokens: aiMode === "enosh-mind" ? 4096 : aiMode === "ex-pro" ? 3072 : 2048,
      temperature: 0.7,
      reasoning_effort: aiMode === "enosh-mind" ? "high" : aiMode === "ex-pro" ? "medium" : "low",
    });

    console.log("[API] NVIDIA API response status:", nvidiaResponse.status);

    if (!nvidiaResponse.ok) {
      const errorText = await nvidiaResponse.text().catch(() => "Unknown error");
      console.error("[API] NVIDIA API error:", nvidiaResponse.status, errorText);
      return res.status(503).json({
        error: "The AI service is temporarily unavailable. Please try again in a moment.",
        code: "PROVIDER_UNAVAILABLE",
      });
    }

    if (nvidiaResponse.body) {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      const reader = nvidiaResponse.body.getReader();
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          res.write(decoder.decode(value, { stream: true }));
        }
      } catch (streamError) {
        console.error("[API] NVIDIA stream timed out or failed:", streamError);
        res.write(`data: ${JSON.stringify({ error: { message: "The NVIDIA response timed out. Please try again." } })}\n\ndata: [DONE]\n\n`);
      }
      res.end();
      return;
    }

    let responseData: any;
    try {
      responseData = await nvidiaResponse.json();
    } catch (parseError) {
      console.error("[API] Invalid JSON response from NVIDIA API:", parseError);
      return res.status(502).json({ error: "The AI service returned an invalid response. Please try again.", code: "INVALID_PROVIDER_RESPONSE" });
    }

    const content = responseData?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.length === 0) {
      console.error("[API] NVIDIA API response did not contain assistant content:", responseData);
      return res.status(502).json({ error: "No response received from the AI service. Please try again.", code: "EMPTY_PROVIDER_RESPONSE" });
    }

    return sendMockResponse(res, content);
  } catch (err) {
    console.error("[API] Unexpected error:", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    
    // Send a helpful message instead of crashing
    return res.status(503).json({
      error: "The AI service is temporarily unavailable. Please try again shortly.",
      code: "AI_REQUEST_FAILED",
    });
  }
}
