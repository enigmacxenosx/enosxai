/*
 * ENOSX AI — useOpenRouter (Modified for Production Tool Calling)
 * Routes calls through the internal /api/chat endpoint to enable 
 * webpage analysis and security detection features.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";

// Route through internal API to enable tool calling and security analysis
const INTERNAL_API_URL = "/api/chat";

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

      try {
        const response = await fetch(INTERNAL_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            githubContext: options?.githubContext,
            aiMode: options?.aiMode,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const errorMsg = errData.error || `API error: ${response.status}`;
          onChunk(`I encountered an error: ${errorMsg}. Please try again.`);
          onDone();
          setIsLoading(false);
          return;
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body from API");
        }

        let hasReceivedData = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          
          // The internal API sends SSE data
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6).trim();
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
        onChunk(`I encountered an error: ${msg}. Please check your connection.`);
        onDone();
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error };
}
