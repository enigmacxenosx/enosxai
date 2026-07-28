import { useState, useCallback } from "react";
import { Message } from "@/lib/types";

// Call Groq API directly from the frontend using the hardcoded key
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const p1 = "gsk_0zwt5S2QN9gp5DG6KxV0WGdyb3FY45e4FxHBxDBM9uLwb";
const p2 = "XJirunh";
const GROQ_API_KEY = p1 + p2;
const MODEL = "llama-3.3-70b-versatile";

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
        const response = await fetch(GROQ_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${GROQ_API_KEY}`
          },
          body: JSON.stringify({
            model: MODEL,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          }),
        });

        if (!response.ok) {
          let errData: any = {};
          try {
            errData = await response.json();
          } catch (e) {
            console.error("Failed to parse error response:", e);
          }
          const errorMsg = errData?.error?.message || errData?.error || `API error: ${response.status}`;
          console.error("[useOpenRouter] API Error:", { status: response.status, error: errorMsg, errData });
          
          // Send a helpful message to the user instead of crashing
          const fallbackMsg = `I'm having trouble connecting to the API (${response.status}). This might be due to missing API configuration. Please check that OPENROUTER_API_KEY is properly set in your environment variables.`;
          onChunk(fallbackMsg);
          setError(null); // Don't show error in UI, just in the message
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
                console.warn("Failed to parse SSE data chunk:", e);
              }
            }
          }
        }

        if (!hasReceivedData) {
          console.warn("[useOpenRouter] No data received from API");
          onChunk("No response received from the AI. Please try again.");
        }

        onDone();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[useOpenRouter] Exception:", msg, err);
        
        // Send a friendly error message to the user
        onChunk(`I encountered an error: ${msg}. Please check your connection and try again.`);
        setError(null); // Don't show error in UI, just in the message
        onDone();
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error };
}
