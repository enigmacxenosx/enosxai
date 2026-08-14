import { useState, useCallback } from "react";
import { toast } from "sonner";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// 2026 Image generation models available via OpenRouter
const IMAGE_MODELS = {
  gemini: "google/gemini-3.1-flash-image",
  gpt: "openai/gpt-5.4-image-2",
  auto: "openrouter/auto",
  free: "google/gemma-4-26b-a4b-it:free" // 2026 high-quality free multimodal model
};

const DEFAULT_IMAGE_MODEL = IMAGE_MODELS.gemini;

interface ImageGenerationResult {
  url: string;
  base64?: string;
  revisedPrompt?: string;
}

export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = useCallback(
    async (prompt: string): Promise<ImageGenerationResult | null> => {
      if (!OPENROUTER_API_KEY) {
        setError("OpenRouter API Key is missing.");
        return null;
      }

      setIsGenerating(true);
      setError(null);

      const attemptGeneration = async (model: string, retryWithFree = true): Promise<ImageGenerationResult | null> => {
        const endpoints = [
          "https://openrouter.ai/api/v1/images/generations",
          "https://openrouter.ai/api/v1/chat/completions"
        ];

        for (const endpoint of endpoints) {
          try {
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://enosxtechnologies450.vercel.app",
                "X-Title": "ENOSX AI",
              },
              body: JSON.stringify({
                model: model,
                prompt: prompt,
                messages: endpoint.includes("chat") ? [{ role: "user", content: prompt }] : undefined
              }),
            });

            if (response.status === 402) {
              if (retryWithFree) {
                toast.error("Insufficient credits for Elite Image generation. Trying Free Mode...");
                return await attemptGeneration(IMAGE_MODELS.free, false);
              } else {
                setError("Insufficient credits. Please top up your OpenRouter account.");
                return null;
              }
            }

            if (response.ok) {
              const data = await response.json();
              const imageData = data?.data?.[0] || data?.choices?.[0]?.message?.attachments?.[0];
              if (imageData) {
                return {
                  url: imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : ""),
                  revisedPrompt: imageData.revised_prompt,
                };
              }
            }
          } catch (e) {}
        }
        return null;
      };

      try {
        const result = await attemptGeneration(DEFAULT_IMAGE_MODEL);
        if (!result) {
          // Final fallback to auto
          return await generateImageFallback(prompt);
        }
        return result;
      } catch (err) {
        setError("Image generation failed.");
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  const generateImageFallback = useCallback(
    async (prompt: string): Promise<ImageGenerationResult | null> => {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/images/generations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer": "https://enosxtechnologies450.vercel.app",
            "X-Title": "ENOSX AI",
          },
          body: JSON.stringify({
            model: IMAGE_MODELS.auto,
            prompt: prompt,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const imageData = data?.data?.[0];
          if (imageData) {
            return {
              url: imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : ""),
              revisedPrompt: imageData.revised_prompt,
            };
          }
        }
      } catch (e) {}
      return null;
    },
    []
  );

  return { generateImage, isGenerating, error };
}
