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
  if (/this AI tier requires an active subscription/i.test(message)) {
    return "ENOSH MIND and EX Pro require an active subscription. Switch to EX Core or upgrade your plan to continue.";
  }

  if (/sign in and subscribe to use this AI tier/i.test(message)) {
    return "Please sign in with your ENOSX account and subscribe to use ENOSH MIND or EX Pro. EX Core is available without a subscription.";
  }

  if (message.includes("401") || message.includes("403") || /authentication|unauthorized|forbidden/i.test(message)) {
    return "This AI mode requires an active ENOSX account and subscription. Switch to EX Core or sign in and upgrade your plan.";
  }

  if (message.includes("402") || /insufficient credits|payment required/i.test(message)) {
    return "This AI mode requires an active subscription. Switch to EX Core or upgrade your ENOSX plan to continue.";
  }

  if (message.includes("429") || /rate limit|high traffic/i.test(message)) {
    return "The AI service is busy right now. Please try again in a minute.";
  }

  if (message.includes("503") || /configuration|unavailable/i.test(message)) {
    return "The AI service is temporarily unavailable. Please try again shortly.";
  }

  if (/FUNCTION_INVOCATION_FAILED|failed to invoke|internal server error/i.test(message)) {
    return "The AI service is temporarily unavailable. Please try again shortly.";
  }

  return "Sorry, I’m having trouble connecting right now. Please try again in a moment.";
}

export function useEnosxAI() {
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
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
      // Surface a friendly in-message indicator while the AI is processing.
      setIsThinking(true);

      try {
        const sendRequest = async () => {
          let userId: string | undefined;
          try {
            const stored = localStorage.getItem("enosx-auth-user");
            userId = stored ? JSON.parse(stored)?.id : undefined;
          } catch {
            userId = undefined;
          }
          return fetch("/api/chat", {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages,
              githubContext: options?.githubContext,
              aiMode: options?.aiMode,
              userId,
            }),
          });
        };

        const response = await sendRequest();

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
        const friendlyError = getFriendlyErrorMessage(errorMessage);
        setError(friendlyError);
        console.error("[useEnosxAI] Error:", errorMessage);

        onChunk(friendlyError);
        onDone();
      } finally {
        setIsLoading(false);
        setIsThinking(false);
      }
    },
    [],
  );


  return { sendMessage, isLoading, isThinking, error, isFreeMode: false };
}
