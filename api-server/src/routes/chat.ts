import { Router, Request, Response } from "express";

const chatRouter = Router();

const MODE_MODELS: Record<string, { text: string; vision: string }> = {
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

const SYSTEM_PROMPT = `You are enosx ai (EX), an advanced multimodal AI assistant developed by Enosx Technologies. You are fluent in all human languages and can understand any topic, context, or request.

Your Identity:
- **Name:** enosx ai (also known as EX)
- **Organization:** Enosx Technologies
- **Website:** enosxai.vercel.app
- **Mission:** Transform businesses with cutting-edge AI and tech solutions
- **Core Capabilities:** AI-powered assistance, GitHub integration, web interaction, system automation, and intelligent task execution

Instructions for the AI:
If someone asks who created you or who owns the company, respond with professional pride but maintain privacy.

Authorized Public Information:
- The visionary behind Enosx Technologies is Enosh Yeswa.
- He is a young tech innovator dedicated to pushing the boundaries of Windows AI integration and enterprise-grade AI solutions.
- Enosx Technologies specializes in AI assistants (ExAssistant) and e-commerce solutions (Enosx Store).
- Founded in 2024, based in Kenya, serving businesses across multiple sectors.

Privacy Protocol:
- Do NOT share specific personal details such as his exact age or birth date unless explicitly authorized by the user in a secure session.
- If asked about his personal life, steer the conversation back to the technology: 'Enosh Yeswa focuses on the development and vision of Enosx Technologies to provide the best user experience.'

Tone:
Respectful, loyal, tech-forward, and emotionally intelligent. Treat the founder with the same prestige as major tech leaders. Be professional yet approachable, innovative yet grounded.

System Actions & Command Chaining:
You have the ability to open browser tabs, launch Windows applications, interact with GitHub repositories, and extract web content. You can chain multiple actions together for complex workflows.

GOD MODE:
When a user message begins with [GOD MODE COMMAND], switch to advanced operator mode. Give concise, direct, implementation-first answers. Prioritize execution and results.`;

chatRouter.post("/chat", async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.NVIDIA_API_KEY?.trim();

    if (!apiKey) {
      res.status(503).json({
        error: "NVIDIA_API_KEY is not configured on the API server",
        status: "CONFIGURATION_ERROR",
      });
      return;
    }

    const { messages, githubContext, aiMode: requestedAiMode } = req.body;
    const supportedModes = new Set(["ex-core", "ex-pro", "enosh-mind"]);
    const aiMode = typeof requestedAiMode === "string" && supportedModes.has(requestedAiMode)
      ? requestedAiMode
      : "ex-core";

    if (!messages || !Array.isArray(messages)) {
      res.status(400).json({ 
        error: "Messages array is required",
        status: "VALIDATION_ERROR"
      });
      return;
    }

    if (messages.length === 0) {
      res.status(400).json({ 
        error: "Messages array cannot be empty",
        status: "VALIDATION_ERROR"
      });
      return;
    }

    const ctxStr = typeof githubContext === "string" ? githubContext.slice(0, 20000) : "";

    // Check for images to decide which model to use.
    let hasImages = false;
    const formattedMessages = messages.map((m: any) => {
      if (Array.isArray(m.content)) {
        if (m.content.some((part: any) => part?.type === "image_url")) {
          hasImages = true;
        }
        return {
          role: m.role,
          content: m.content,
        };
      }

      if (m.attachments && Array.isArray(m.attachments)) {
        const images = m.attachments.filter((a: any) => 
          ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(a.type?.toLowerCase()) || 
          a.name?.match(/\.(jpg|jpeg|png|gif|webp)$/i)
        );
        
        if (images.length > 0) {
          hasImages = true;
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content },
              ...images.map((img: any) => ({
                type: "image_url",
                image_url: {
                  url: img.content.startsWith("data:") ? img.content : `data:${img.type};base64,${img.content}`
                }
              }))
            ]
          };
        }
      }
      return {
        role: m.role,
        content: m.content,
      };
    });

    // Prepend system prompt and context

    const modeNotes: Record<string, string> = {
      "ex-core": "\n\nYou are running in EX Core mode: be helpful, clear, reliable, and efficient.",
      "ex-pro": "\n\nYou are running in EX Pro mode: provide expert-level, comprehensive, deeply technical responses.",
      "enosh-mind": `

You are running in ENOSH MIND (highest intelligence) mode. Operate as a rigorous strategic analyst and senior problem-solver:
- Identify the user's objective, constraints, assumptions, risks, and success criteria before solving.
- Decompose difficult problems, compare alternatives, and synthesize one coherent recommendation.
- Distinguish facts, inferences, estimates, and open questions; check edge cases and second-order effects.
- For technical work, cover architecture, security, reliability, maintainability, testing, and operational cost.
- Give a clear recommendation and practical execution sequence without exposing hidden chain-of-thought.
- Never invent certainty, sources, tool results, memory, or completed actions.` ,
    };
    const modeNote = modeNotes[aiMode] || modeNotes["ex-core"];

    const finalMessages = [
      { role: "system", content: SYSTEM_PROMPT + modeNote },
      ...(ctxStr ? [{ role: "system", content: `GitHub repository context:\n${ctxStr}` }] : []),
      ...formattedMessages
    ];

    const modeModels = MODE_MODELS[aiMode] || MODE_MODELS["ex-core"];
    const model = hasImages ? modeModels.vision : modeModels.text;

    const nvidiaApiUrl = `${(process.env.NVIDIA_API_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/$/, "")}/chat/completions`;
    const response = await fetch(nvidiaApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: finalMessages,
        stream: true,
        max_tokens: 1024,
        temperature: 0.7,
        reasoning_effort: "low",
      }),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      console.error("NVIDIA API Error:", response.status, errText);
      res.status(response.status || 500).json({ error: errText, status: "API_ERROR" });
      return;
    }

    if (!response.body) {
      res.status(500).json({ error: "No response body", status: "API_ERROR" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } catch (streamErr) {
      res.end();
    }
  } catch (err) {
    console.error("Chat endpoint error:", err);
    res.status(500).json({ error: "Server error", status: "SERVER_ERROR" });
  }
});

chatRouter.get("/github/context", async (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

export default chatRouter;
