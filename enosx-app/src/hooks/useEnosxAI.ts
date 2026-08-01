/*
 * ENOSX AI — useEnosxAI
 * Powered by Groq LPU Technology for Lightning Fast Inference.
 */

import { useState, useCallback } from "react";
import { Message } from "@/lib/types";
import { toast } from "sonner";

const ENOSX_AI_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const ENOSX_AI_KEY = import.meta.env.VITE_ENOSX_AI_KEY || import.meta.env.VITE_GROQ_API_KEY || "";

// ── Enosx AI Model Mapping (Groq) ──────────────────────────────────────────────────────────
const MODELS = {
  text: {
    "ex":        "llama-3.3-70b-versatile",
    "ex-pro":    "llama-3.3-70b-versatile",
    "smart":     "llama-3.3-70b-versatile",
    "fast":      "llama-3.1-8b-instant",
    "balanced":  "llama-3.3-70b-versatile",
    "task":      "deepseek-r1-distill-llama-70b",
    "creative":  "llama-3.3-70b-versatile",
  },
  vision: {
    "ex":        "llama-3.2-11b-vision-preview",
    "ex-pro":    "llama-3.2-90b-vision-preview",
    "smart":     "llama-3.2-90b-vision-preview",
    "fast":      "llama-3.2-11b-vision-preview",
    "balanced":  "llama-3.2-11b-vision-preview",
    "task":      "llama-3.2-11b-vision-preview",
    "creative":  "llama-3.2-90b-vision-preview",
  },
} as const;

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

      if (!ENOSX_AI_KEY) {
        onChunk("API key missing. Please configure VITE_ENOSX_AI_KEY.");
        onDone();
        setIsLoading(false);
        return;
      }

      const hasImages = messages.some(m => m.attachments?.some(a => a.type.startsWith("image/")));
      const aiMode = (options?.aiMode as keyof typeof MODELS.text) || "ex";
      
      let model = hasImages ? MODELS.vision[aiMode] : MODELS.text[aiMode];

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

      try {
        const response = await fetch(ENOSX_AI_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${ENOSX_AI_KEY}`,
          },
          body: JSON.stringify({
            model,
            messages: currentMessages,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `API Error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader available");
        
        const decoder = new TextDecoder();

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
                onChunk(delta.content);
              }
            } catch (e) {}
          }
        }
        onDone();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        toast.error("Enosx AI Error", { description: errorMessage });
        onChunk(`\n\n### ⚠️ Enosx AI Error\n\n${errorMessage}`);
        onDone();
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendMessage, isLoading, error, isFreeMode: false };
}
