/**
 * ENOSX AI — /api/chat  (Vercel Serverless Function)
 * Uses OpenRouter as the AI provider with improved error handling and fallback.
 * Environment variables:
 *   - OPENROUTER_API_KEY (required)
 *   - OPENROUTER_MODEL (optional, defaults to meta-llama/llama-3.3-70b-instruct)
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

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
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  const mockData = JSON.stringify({
    choices: [{ delta: { content: message } }],
  });

  res.write(`data: ${mockData}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
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
    const apiKey = process.env.ENOSX_AI_KEY || process.env.GROQ_API_KEY || process.env.OPENROUTER_API_KEY;

    // If no API key, send a helpful mock response
    if (!apiKey || apiKey.trim() === "") {
      console.warn("[API] AI API key is missing. Sending fallback response.");
      return sendMockResponse(
        res,
        "ENOSX AI is currently in offline mode. The ENOSX_AI_KEY environment variable is not configured. Please set it in your project settings to enable full functionality."
      );
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

    console.log("[API] Sending request to Groq with", chatMessages.length, "messages");

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
        messages: chatMessages,
        stream: true,
        max_tokens: 2048,
        temperature: 0.7,
      }),
    });

    console.log("[API] Groq response status:", groqResponse.status);

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text().catch(() => "Unknown error");
      console.error("[API] Groq error:", groqResponse.status, errorText);

      let errorMessage = `Groq API error: ${groqResponse.status}`;
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData?.error?.message || errorData?.error || errorMessage;
      } catch {
        errorMessage = errorText || errorMessage;
      }

      // Send a helpful message instead of an error
      return sendMockResponse(
        res,
        `I'm having trouble reaching the AI service (${groqResponse.status}). This might be a temporary issue. Error details: ${errorMessage}. Please try again in a moment.`
      );
    }

    if (!groqResponse.body) {
      console.error("[API] No response body from Groq");
      return sendMockResponse(res, "No response received from the AI service. Please try again.");
    }

    // Set streaming headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    // Stream the response
    const reader = groqResponse.body.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
      res.end();
    } catch (streamError) {
      console.error("[API] Streaming error:", streamError);
      res.end();
    }
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
