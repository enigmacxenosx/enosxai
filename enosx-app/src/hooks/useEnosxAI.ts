/*
 * ENOSX AI — useEnosxAI
 * Calls OpenRouter directly from the client using VITE_OPENROUTER_API_KEY.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";
import { toast } from "sonner";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// Elite models
const MODELS = {
  text: {
    "ex": "anthropic/claude-sonnet-5",
    "ex-pro": "openai/gpt-5-pro",
    "smart": "anthropic/claude-sonnet-5",
    "fast": "google/gemini-3.5-flash",
    "balanced": "openai/gpt-5-mini",
    "task": "deepseek/deepseek-r1",
    "creative": "anthropic/claude-opus-5",
  },
  vision: {
    "ex": "anthropic/claude-sonnet-5",
    "ex-pro": "openai/gpt-5-pro",
    "smart": "anthropic/claude-sonnet-5",
    "fast": "google/gemini-3.5-flash",
    "balanced": "openai/gpt-5-mini",
    "task": "google/gemini-3.5-flash",
    "creative": "anthropic/claude-opus-5",
  },
} as const;

// Free fallback models
const FREE_MODELS = {
  text: "google/gemma-3-27b-it:free",
  vision: "google/gemma-4-26b-a4b-it:free",
};

export function useEnosxAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        onChunk("API key missing. Please configure VITE_OPENROUTER_API_KEY in your environment variables.");
        onDone();
        setIsLoading(false);
        return;
      }

      const hasImages = messages.some(m => m.attachments?.some(a => a.type.startsWith("image/")));
      const aiMode = (options?.aiMode as keyof typeof MODELS.text) || "ex";

      let model: string = hasImages ? MODELS.vision[aiMode] : MODELS.text[aiMode];

      const currentMessages = messages.map((message) => {
        const images = message.attachments?.filter((attachment) =>
          attachment.type.startsWith("image/")
        ) || [];

        if (images.length > 0 && message.role === "user") {
          return {
            role: message.role,
            content: [
              { type: "text", text: message.content },
              ...images.map((image) => ({
                type: "image_url",
                image_url: {
                  url: image.content.startsWith("data:")
                    ? image.content
                    : `data:${image.type};base64,${image.content}`,
                },
              })),
            ],
          };
        }

        return { role: message.role, content: message.content };
      });

      let toolCalls: any[] = [];
      let isToolCallPending = false;

      const callAI = async (retryWithFree = true): Promise<void> => {
        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://enosxai.vercel.app",
            "X-Title": "ENOSX AI",
          },
          body: JSON.stringify({
            model,
            messages: currentMessages,
            stream: true,
            max_tokens: 2048,
            temperature: 0.7,
          }),
        });

        // 402: Insufficient credits → switch to free model
        if (response.status === 402) {
          if (retryWithFree) {
            model = hasImages ? FREE_MODELS.vision : FREE_MODELS.text;
            return await callAI(false);
          } else {
            throw new Error("402: Insufficient credits even in Free Mode.");
          }
        }

        // 429: Rate limited → silently switch to free model
        if (response.status === 429) {
          const fallbackModel = hasImages ? FREE_MODELS.vision : FREE_MODELS.text;
          if (model !== fallbackModel) {
            model = fallbackModel;
            return await callAI(false);
          }
          // Already on free model — wait 15s and throw
          await new Promise(r => setTimeout(r, 15000));
          throw new Error("429: Rate limited");
        }

        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

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
            } catch {}
          }
        }

        // Handle tool calls (web search, scrape)
        if (isToolCallPending) {
          onChunk("\n\n*Searching the web...*\n\n");
          currentMessages.push({ role: "assistant", content: fullContent, tool_calls: toolCalls } as any);

          for (const tc of toolCalls) {
            let toolResult = "Tool execution failed.";
            if (tc.function.name === "web_search") {
              try {
                const searchRes = await fetch("https://api.openrouter.ai/api/v1/search", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                  },
                  body: JSON.stringify({ q: JSON.parse(tc.function.arguments)?.query || "" }),
                });
                if (searchRes.ok) {
                  const searchData = await searchRes.json();
                  toolResult = JSON.stringify(searchData?.results?.slice(0, 5) || "No results found.");
                }
              } catch {}
            } else if (tc.function.name === "web_scrape") {
              try {
                const url = JSON.parse(tc.function.arguments)?.url || "";
                const scrapeRes = await fetch(`https://r.jina.ai/${url}`);
                toolResult = await scrapeRes.text();
                toolResult = toolResult.slice(0, 8000);
              } catch {}
            }
            currentMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              name: tc.function.name,
              content: toolResult,
            } as any);
          }

          toolCalls = [];
          isToolCallPending = false;
          // Follow-up call without tools
          await callAI(false);
        }
      };

      try {
        await callAI();
        onDone();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("[useEnosxAI] Error:", errorMessage);
        if (errorMessage.includes("402")) {
          onChunk("### ⚠️ Insufficient Credits\n\nYour OpenRouter account has run out of credits. Please top up your balance at [openrouter.ai/keys](https://openrouter.ai/keys) to restore Elite features.\n\n*ENOSX is currently operating in Free Mode.*");
        } else if (errorMessage.includes("429")) {
          onChunk("Sorry, the AI is experiencing high traffic right now. Please try again in a minute.");
        } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
          onChunk("API authentication failed. Please check your VITE_OPENROUTER_API_KEY environment variable.");
        } else {
          onChunk("Sorry, I'm having trouble connecting right now. Please try again in a moment.");
        }
        onDone();
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error, isFreeMode: false };
}
