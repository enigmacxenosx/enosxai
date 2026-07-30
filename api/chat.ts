/**
 * ENOSX AI — /api/chat (Vercel Serverless Function)
 * Enhanced with Tool Calling for Webpage Analysis and Security Detection.
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SYSTEM_PROMPT = `You are ENOSX AI (EX), an advanced multimodal AI assistant developed by Enosx Technologies.

Core Capabilities:
1. **Webpage Vision**: You can "see" webpages using 'read_webpage'. Always perform security checks on URLs.
2. **Visual Communication**: You can display images using Markdown syntax: ![description](url).
3. **Image Generation**: Use 'generate_image' to create visual content for the user.

Security Protocol:
- If 'securityReport.isSuspicious' is true, warn the user with a clear red alert.
- Look for unauthorized camera access or IP tracking indicators.

Instructions:
- Use professional, tech-forward language.
- When generating images, provide a descriptive alt text.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "read_webpage",
      description: "Read the content of a webpage and perform a security analysis.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL of the webpage to read." },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_image",
      description: "Generate an image based on a prompt.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "A detailed description of the image to generate." },
        },
        required: ["prompt"],
      },
    },
  },
];

const sendMockResponse = (res: VercelResponse, message: string) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: message } }] })}\n\n`);
  res.write("data: [DONE]\n\n");
  res.end();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return sendMockResponse(res, "API key missing. Please set OPENROUTER_API_KEY in Vercel.");

    const { messages, githubContext } = req.body;
    const ctxStr = typeof githubContext === "string" ? githubContext.slice(0, 20000) : "";

    let currentMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(ctxStr ? [{ role: "system", content: `GitHub context:\n${ctxStr}` }] : []),
      ...messages.map((m: any) => ({ role: m.role, content: m.content })),
    ];

    // First call to check for tool use
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct",
        messages: currentMessages,
        tools: TOOLS,
        tool_choice: "auto",
      }),
    });

    const data = await response.json();
    const message = data.choices[0].message;

    if (message.tool_calls) {
      for (const toolCall of message.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        let toolResult = "";

        if (name === "read_webpage") {
          const protocol = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers["host"];
          const browserRes = await fetch(`${protocol}://${host}/api/browser?url=${encodeURIComponent(args.url)}`);
          toolResult = await browserRes.text();
        } else if (name === "generate_image") {
          // Use a high-quality placeholder or image generation service
          const encodedPrompt = encodeURIComponent(args.prompt);
          const imageUrl = `https://pollinations.ai/p/${encodedPrompt}?width=1024&height=1024&seed=${Math.floor(Math.random() * 1000000)}&nologo=true`;
          toolResult = JSON.stringify({
            success: true,
            imageUrl,
            markdown: `![${args.prompt}](${imageUrl})`
          });
        }

        currentMessages.push(message);
        currentMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }

      // Second call with tool results
      const secondResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: currentMessages,
          stream: true,
        }),
      });

      res.setHeader("Content-Type", "text/event-stream");
      const reader = secondResponse.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    } else {
      // No tool calls, stream the response
      const streamResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct",
          messages: currentMessages,
          stream: true,
        }),
      });

      res.setHeader("Content-Type", "text/event-stream");
      const reader = streamResponse.body!.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
      res.end();
    }
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Server error" });
  }
}
