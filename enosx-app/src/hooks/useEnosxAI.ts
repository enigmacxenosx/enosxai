/*
 * ENOSX AI — useEnosxAI
 * Sends chat requests through the application's server-side API route.
 * Provider credentials and fallback routing remain on the server.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";

type ChatOptions = {
  aiMode?: string;
  githubContext?: string;
};

type ApiErrorPayload = {
  error?: string | { message?: string };
};

async function getErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload;
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
    if (typeof payload.error === "object" && typeof payload.error?.message === "string" && payload.error.message.trim()) {
      return payload.error.message;
    }
  } catch {
    // A non-JSON error response is handled by the status fallback below.
  }

  return `API Error: ${response.status}`;
}

function getFriendlyErrorMessage(message: string) {
  if (message.includes("401") || message.includes("403") || /authentication|unauthorized|forbidden/i.test(message)) {
    return "The AI service credentials need attention. Please contact support if this continues.";
  }

  if (message.includes("402") || /insufficient credits|payment required/i.test(message)) {
    return "The AI service is temporarily unavailable because its usage balance needs attention. Please try again later.";
  }

  if (message.includes("429") || /rate limit|high traffic/i.test(message)) {
    return "The AI service is busy right now. Please try again in a minute.";
  }

  if (message.includes("503") || /configuration|unavailable/i.test(message)) {
    return "The AI service is temporarily unavailable. Please try again shortly.";
  }

  return "Sorry, I’m having trouble connecting right now. Please try again in a moment.";
}

export function useEnosxAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (
      messages: Message[],
      onChunk: (chunk: string) => void,
      onDone: () => void,
      options?: ChatOptions,
    ) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            githubContext: options?.githubContext,
            aiMode: options?.aiMode,
          }),
        });

        if (!response.ok) {
          throw new Error(await getErrorMessage(response));
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("The AI service returned an empty response stream.");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let sawContent = false;
        let streamError: string | null = null;

        const processEvent = (event: string) => {
          for (const line of event.split("\n")) {
            if (!line.startsWith("data: ")) continue;

            const data = line.slice(6).trim();
            if (!data || data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data) as {
                choices?: Array<{ delta?: { content?: string } }>;
                error?: { message?: string };
              };

              if (parsed.error?.message) {
                streamError = parsed.error.message;
                continue;
              }

              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                sawContent = true;
                onChunk(content);
              }
            } catch {
              // Ignore malformed non-SSE lines and continue processing the stream.
            }
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          events.forEach(processEvent);
        }

        buffer += decoder.decode();
        if (buffer.trim()) processEvent(buffer);

        if (streamError) {
          throw new Error(streamError);
        }

        if (!sawContent) {
          onChunk("Sorry, I received an empty response this time. Please try again — I’ll pick right back up where we left off.");
        }

        onDone();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("[useEnosxAI] Error:", errorMessage);
        onChunk(getFriendlyErrorMessage(errorMessage));
        onDone();
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return { sendMessage, isLoading, error, isFreeMode: false };
}
