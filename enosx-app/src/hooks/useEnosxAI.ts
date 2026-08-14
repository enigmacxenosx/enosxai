/*
 * ENOSX AI — useEnosxAI
 * Chat requests are proxied through the server-side /api/chat endpoint.
 * The OpenRouter API key must remain server-side as OPENROUTER_API_KEY.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";
import { toast } from "sonner";

const ENOSX_AI_API_URL = "/api/chat";

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

      try {
        const response = await fetch(ENOSX_AI_API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: currentMessages,
            githubContext: options?.githubContext,
            aiMode: options?.aiMode,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            onChunk("Sorry, the AI is experiencing high traffic right now. Please try again in a minute.");
            onDone();
            setIsLoading(false);
            return;
          }
          if (response.status === 503) {
            onChunk("API key is not configured. Please check your Vercel environment variables.");
            onDone();
            setIsLoading(false);
            return;
          }
          const errorText = await response.text().catch(() => "");
          let errorMessage = `API Error: ${response.status}`;
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData?.error || errorData?.message || errorMessage;
          } catch {
            if (errorText.trim()) errorMessage = errorText;
          }
          throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });

          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            const dataLine = event
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            const data = dataLine.slice(6).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (content) onChunk(content);
            } catch {
              // Ignore incomplete or provider-specific SSE frames.
            }
          }

          if (done) break;
        }

        onDone();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("[useEnosxAI] Error:", errorMessage);
        toast.error("Enosx AI Error", { description: errorMessage });
        if (errorMessage.includes("429")) {
          onChunk("Sorry, the AI is experiencing high traffic right now. Please try again in a minute.");
        } else if (errorMessage.includes("401") || errorMessage.includes("403")) {
          onChunk("API authentication failed. Please check your Vercel environment variables.");
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
