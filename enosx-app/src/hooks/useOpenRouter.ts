/*
 * ENOSX AI — useOpenRouter
 * Calls OpenRouter API with model selection based on AI mode and content type.
 * API key is read from VITE_OPENROUTER_API_KEY environment variable.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// ── Model mapping per AI mode ────────────────────────────────────────────────────
// Each mode maps to a specific OpenRouter model slug.
// Vision models are used when images are detected in the conversation.
const MODELS = {
  // ── Text models (no images) ────────────────────────────────────────────────────
  text: {
    "ex":        "meta-llama/llama-4-maverick",
    "ex-pro":    "anthropic/claude-sonnet-4",
    "smart":     "anthropic/claude-3.5-sonnet",
    "fast":      "google/gemini-2.5-flash",
    "balanced":  "openai/gpt-4.1-mini",
    "task":      "deepseek/deepseek-chat-v3-0324:free",
    "creative":  "anthropic/claude-sonnet-4",
  },
  // ── Vision models (images detected) ───────────────────────────────────────────
  vision: {
    "ex":        "meta-llama/llama-4-maverick",
    "ex-pro":    "anthropic/claude-sonnet-4",
    "smart":     "anthropic/claude-3.5-sonnet",
    "fast":      "google/gemini-2.5-flash",
    "balanced":  "openai/gpt-4.1-mini",
    "task":      "google/gemini-2.0-flash-exp:free",
    "creative":  "anthropic/claude-sonnet-4",
  },
} as const;

const DEFAULT_TEXT_MODEL = "meta-llama/llama-4-maverick";
const DEFAULT_VISION_MODEL = "google/gemini-2.0-flash-exp:free";

export function useOpenRouter() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      messages: Message[],
      onChunk: (chunk: string) => void,
      onDone: () => void,
      options?: { githubContext?: string; aiMode?: string }
    ) => {
      setIsLoading(true);
      setError(null);

      // Validate API key
      if (!OPENROUTER_API_KEY) {
        const fallbackMsg =
          "API key is not configured. Please set VITE_OPENROUTER_API_KEY in your environment variables.";
        onChunk(fallbackMsg);
        onDone();
        setIsLoading(false);
        return;
      }

      try {
        // Check if any message has image attachments
        const hasImages = messages.some(
          (m) =>
            m.attachments?.some(
              (a) =>
                ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
                  a.type.toLowerCase()
                ) || a.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            )
        );

        const aiMode = (options?.aiMode as keyof typeof MODELS.text) || "ex";
        const modelKey = hasImages ? "vision" : "text";
        const model =
          MODELS[modelKey][aiMode] ||
          (hasImages ? DEFAULT_VISION_MODEL : DEFAULT_TEXT_MODEL);

        const formattedMessages = messages.map((m) => {
          const images =
            m.attachments?.filter(
              (a) =>
                ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(
                  a.type.toLowerCase()
                ) || a.name.match(/\.(jpg|jpeg|png|gif|webp)$/i)
            ) || [];

          if (images.length > 0 && m.role === "user") {
            return {
              role: m.role,
              content: [
                { type: "text", text: m.content },
                ...images.map((img) => ({
                  type: "image_url",
                  image_url: {
                    url: img.content.startsWith("data:")
                      ? img.content
                      : `data:${img.type};base64,${img.content}`,
                  },
                })),
              ],
            };
          }

          return {
            role: m.role,
            content: m.content,
          };
        });

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer":
              import.meta.env.VITE_SITE_URL || "https://enosx.vercel.app",
            "X-Title": "ENOSX AI",
          },
          body: JSON.stringify({
            model: model,
            messages: formattedMessages,
            stream: true,
            max_tokens: 4096,
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          let errData: any = {};
          try {
            errData = await response.json();
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
          const errorMsg =
            errData?.error?.message ||
            errData?.error ||
            `API error: ${response.status}`;
          console.error("[useOpenRouter] API Error:", {
            status: response.status,
            error: errorMsg,
            errData,
            model,
          });

          let fallbackMsg = `I'm having trouble connecting to the AI service (${response.status}). Error: ${errorMsg}`;
          if (response.status === 401) {
            fallbackMsg =
              "API authentication failed. Please verify your OpenRouter API key is valid and set correctly in the environment variables.";
          } else if (response.status === 429) {
            fallbackMsg =
              "Rate limit exceeded. Please wait a moment and try again.";
          }
          onChunk(fallbackMsg);
          onDone();
          setIsLoading(false);
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body from API");
        }

        let buffer = "";
        let hasReceivedData = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine) continue;

            if (trimmedLine.startsWith("data: ")) {
              const data = trimmedLine.slice(6).trim();
              if (data === "[DONE]") {
                onDone();
                setIsLoading(false);
                return;
              }
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) {
                  hasReceivedData = true;
                  onChunk(content);
                }
              } catch (e) {
                // Ignore parsing errors for partial chunks
              }
            }
          }
        }

        if (!hasReceivedData) {
          onChunk("No response received from the AI. Please try again.");
        }

        onDone();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        onChunk(
          `I encountered an error: ${msg}. Please check your connection and try again.`
        );
        onDone();
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error };
}
