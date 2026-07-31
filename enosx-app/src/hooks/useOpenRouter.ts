/*
 * ENOSX AI — useOpenRouter
 * Upgraded 2026 Elite Intelligence with automatic 402 (Payment Required) fail-safe.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";
import { toast } from "sonner";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";
const SERPER_API_KEY = import.meta.env.VITE_SERPER_API_KEY || "";

// ── 2026 Elite Model Mapping ──────────────────────────────────────────────────────────
const MODELS = {
  text: {
    "ex":        "anthropic/claude-sonnet-5",
    "ex-pro":    "openai/gpt-5-pro",
    "smart":     "anthropic/claude-sonnet-5",
    "fast":      "google/gemini-3.5-flash",
    "balanced":  "openai/gpt-5-mini",
    "task":      "deepseek/deepseek-r1",
    "creative":  "anthropic/claude-opus-5",
  },
  vision: {
    "ex":        "anthropic/claude-sonnet-5",
    "ex-pro":    "openai/gpt-5-pro",
    "smart":     "anthropic/claude-sonnet-5",
    "fast":      "google/gemini-3.5-flash",
    "balanced":  "openai/gpt-5-mini",
    "task":      "google/gemini-3.5-flash",
    "creative":  "anthropic/claude-opus-5",
  },
} as const;

// ── 2026 Free Fallback Models ─────────────────────────────────────────────────────────
const FREE_MODELS = {
  text: "google/gemma-4-31b-it:free",
  vision: "google/gemma-4-26b-a4b-it:free",
  auto: "openrouter/free"
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the internet for real-time information, news, or specific queries.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "web_scrape",
      description: "Extract the full text content and markdown from a specific URL.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL of the webpage to read" }
        },
        required: ["url"]
      }
    }
  }
];

export function useOpenRouter() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFreeMode, setIsFreeMode] = useState(false);

  const executeTool = async (name: string, args: any) => {
    if (name === "web_search") {
      if (!SERPER_API_KEY) return "Error: Search API key missing.";
      try {
        const res = await fetch("https://google.serper.dev/search", {
          method: "POST",
          headers: { "X-API-KEY": SERPER_API_KEY, "Content-Type": "application/json" },
          body: JSON.stringify({ q: args.query })
        });
        const data = await res.json();
        return JSON.stringify(data.organic?.slice(0, 5) || "No results found.");
      } catch (e) { return "Search failed."; }
    }
    if (name === "web_scrape") {
      try {
        const res = await fetch(`https://r.jina.ai/${args.url}`);
        const text = await res.text();
        return text.slice(0, 8000);
      } catch (e) { return "Scraping failed."; }
    }
    return "Unknown tool.";
  };

  const sendMessage = useCallback(
    async (
      messages: Message[],
      onChunk: (chunk: string) => void,
      onDone: () => void,
      options?: { aiMode?: string; githubContext?: string }
    ) => {
      setIsLoading(true);
      setError(null);

      if (!OPENROUTER_API_KEY) {
        onChunk("API key missing. Please configure VITE_OPENROUTER_API_KEY.");
        onDone();
        setIsLoading(false);
        return;
      }

      const hasImages = messages.some(m => m.attachments?.some(a => a.type.startsWith("image/")));
      const aiMode = (options?.aiMode as keyof typeof MODELS.text) || "ex";
      
      // Select model based on state and content
      let model = isFreeMode 
        ? (hasImages ? FREE_MODELS.vision : FREE_MODELS.text)
        : (hasImages ? MODELS.vision[aiMode] : MODELS.text[aiMode]);

      let currentMessages = messages.map(m => {
        const images = m.attachments?.filter(a => a.type.startsWith("image/")) || [];
        if (images.length > 0 && m.role === "user") {
          return {
            role: m.role,
            content: [
              { type: "text", text: m.content },
              ...images.map(img => ({
                type: "image_url",
                image_url: { url: img.content.startsWith("data:") ? img.content : `data:${img.type};base64,${img.content}` }
              }))
            ]
          };
        }
        return { role: m.role, content: m.content };
      });

      let toolCalls: any[] = [];
      let isToolCallPending = false;

      const callAI = async (retryWithFree = true): Promise<void> => {
        try {
          const response = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": "https://enosx.vercel.app",
              "X-Title": "ENOSX AI",
            },
            body: JSON.stringify({
              model,
              messages: currentMessages,
              tools: model.includes("deepseek-r1") ? undefined : TOOLS,
              stream: true,
            }),
          });

          if (response.status === 402) {
            if (retryWithFree) {
              console.warn("402 Error: Insufficient credits. Switching to Free Mode...");
              setIsFreeMode(true);
              toast.error("Insufficient credits. Switching to ENOSX Free Mode...", {
                description: "You can continue chatting for free, but some elite features may be limited."
              });
              model = hasImages ? FREE_MODELS.vision : FREE_MODELS.text;
              return await callAI(false); // Retry once with free model
            } else {
              throw new Error("402: Insufficient credits even in Free Mode.");
            }
          }

          if (response.status === 429) {
            onChunk("I'm thinking... one moment.");
            await new Promise(resolve => setTimeout(resolve, 5000));
            try {
              const retryRes = await fetch(OPENROUTER_API_URL, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                  "HTTP-Referer": "https://enosx.vercel.app",
                  "X-Title": "ENOSX AI",
                },
                body: JSON.stringify({
                  model,
                  messages: currentMessages,
                  tools: model.includes("deepseek-r1") ? undefined : TOOLS,
                  stream: true,
                }),
              });
              if (!retryRes.ok) throw new Error(`API Error: ${retryRes.status}`);
              const retryReader = retryRes.body?.getReader();
              if (!retryReader) throw new Error("No reader available");
              const retryDecoder = new TextDecoder();
              let retryContent = "";
              while (true) {
                const { done, value } = await retryReader.read();
                if (done) break;
                const retryChunks = retryDecoder.decode(value).split("\n");
                for (const chunk of retryChunks) {
                  if (!chunk.startsWith("data: ")) continue;
                  const data = chunk.slice(6).trim();
                  if (data === "[DONE]") continue;
                  try {
                    const parsed = JSON.parse(data);
                    const delta = parsed.choices[0].delta;
                    if (delta.content) { retryContent += delta.content; onChunk(delta.content); }
                  } catch {}
                }
              }
              return;
            } catch {
              onChunk("I'm still processing — it's busy right now. Please try again in a moment.");
              return;
            }
          }

          if (!response.ok) throw new Error(`API Error: ${response.status}`);

          const reader = response.body?.getReader();
          if (!reader) throw new Error("No reader available");
          
          const decoder = new TextDecoder();
          let fullContent = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunks = decoder.decode(value).split("\n");
            for (const chunk of chunks) {
              if (!chunk.startsWith("data: ")) continue;
              const data = chunk.slice(6).trim();
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices[0].delta;

                if (delta.content) {
                  fullContent += delta.content;
                  onChunk(delta.content);
                }

                if (delta.tool_calls) {
                  isToolCallPending = true;
                  delta.tool_calls.forEach((tc: any) => {
                    if (!toolCalls[tc.index]) toolCalls[tc.index] = tc;
                    if (tc.function?.name) toolCalls[tc.index].function.name = tc.function.name;
                    if (tc.function?.arguments) toolCalls[tc.index].function.arguments = (toolCalls[tc.index].function.arguments || "") + tc.function.arguments;
                  });
                }
              } catch (e) {}
            }
          }

          if (isToolCallPending) {
            onChunk("\n\n*Analyzing web content...*\n\n");
            currentMessages.push({ role: "assistant", content: fullContent, tool_calls: toolCalls } as any);
            
            for (const tc of toolCalls) {
              const result = await executeTool(tc.function.name, JSON.parse(tc.function.arguments));
              currentMessages.push({
                role: "tool",
                tool_call_id: tc.id,
                name: tc.function.name,
                content: result
              } as any);
            }
            
            toolCalls = [];
            isToolCallPending = false;
            await callAI(false);
          }
        } catch (err) {
          throw err;
        }
      };

      try {
        await callAI();
        onDone();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        if (errorMessage.includes("402")) {
          onChunk("### ⚠️ Insufficient Credits\n\nYour OpenRouter account has run out of credits. Please top up your balance at [openrouter.ai/keys](https://openrouter.ai/keys) to restore Elite features.\n\n*ENOSX is currently operating in Free Mode.*");
        } else {
          onChunk(`Error: ${errorMessage}`);
        }
        onDone();
      } finally {
        setIsLoading(false);
      }
    },
    [isFreeMode]
  );

  return { sendMessage, isLoading, error, isFreeMode };
}
