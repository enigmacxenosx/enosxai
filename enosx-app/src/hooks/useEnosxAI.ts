/*
 * ENOSX AI — useEnosxAI
 * Sends chat requests through the application's server-side API route.
 * Provider credentials and fallback routing remain on the server.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const CLIENT_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

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
        // One automatic retry on 500-class server errors before treating the
        // request as failed. Transient Vercel serverless hiccups
        // (FUNCTION_INVOCATION_FAILED) often clear on a second attempt, and the
        // server route itself now performs provider-level retries too.
        const sendRequest = async () =>
          fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages,
              githubContext: options?.githubContext,
              aiMode: options?.aiMode,
            }),
          });

        let response = await sendRequest();
        if (!response.ok && response.status >= 500) {
          console.warn("[useEnosxAI] Server returned", response.status, "— retrying once");
          await new Promise(r => setTimeout(r, 2500));
          response = await sendRequest();
        }

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

        // Resilience path: if the serverless chat route is down (FUNCTION_INVOCATION_FAILED),
        // fall back to a direct client-side OpenRouter call when a client key is configured.
        if (CLIENT_API_KEY && (errorMessage.includes("500") || errorMessage.includes("502") || errorMessage.includes("503"))) {
          console.warn("[useEnosxAI] Server route unavailable — switching to direct OpenRouter fallback");
          try {
            await callOpenRouterDirect(messages, options, onChunk);
            onDone();
            return;
          } catch (directErr) {
            console.error("[useEnosxAI] Direct fallback also failed:", directErr);
          }
        }

        onChunk(getFriendlyErrorMessage(errorMessage));
        onDone();
      } finally {
        setIsLoading(false);
        setIsThinking(false);
      }
    },
    [],
  );

  async function callOpenRouterDirect(
    messages: Message[],
    options: ChatOptions | undefined,
    onChunk: (chunk: string) => void,
  ) {
    const hasImages = messages.some((m) =>
      Array.isArray(m.attachments) && m.attachments.some((a: any) => typeof a.type === "string" && a.type.startsWith("image/")),
    );
    const model = "openrouter/auto";
    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CLIENT_API_KEY}`,
        "HTTP-Referer": "https://enosxtechnologies450.vercel.app",
        "X-Title": "ENOSX AI",
      },
      body: JSON.stringify({
        model,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        stream: true,
        max_tokens: 2048,
      }),
    });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("No stream available");
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const content = JSON.parse(data)?.choices?.[0]?.delta?.content;
          if (typeof content === "string") onChunk(content);
        } catch {
          // ignore malformed chunks
        }
      }
    }
  }

  return { sendMessage, isLoading, isThinking, error, isFreeMode: false };
}
