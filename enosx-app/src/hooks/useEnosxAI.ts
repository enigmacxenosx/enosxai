/*
 * ENOSX AI — useEnosxAI
 * Calls OpenRouter directly from the client using VITE_OPENROUTER_API_KEY.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";
import { toast } from "sonner";

const API_CHAT_URL = "/api/chat";

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
        const response = await fetch(API_CHAT_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: currentMessages,
            githubContext: options?.githubContext,
            aiMode: options?.aiMode || "ex",
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API Error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response stream available");

        const decoder = new TextDecoder();
        let sawAnyContent = false;

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
                sawAnyContent = true;
                onChunk(delta.content);
              }
            } catch {}
          }
        }

        if (!sawAnyContent) {
          onChunk("Sorry, I received an empty response. Please try again.");
        }
        onDone();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        onChunk(`Sorry, I'm having trouble connecting: ${errorMessage}`);
        onDone();
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error, isFreeMode: false };
}
