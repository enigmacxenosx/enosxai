import { useState, useCallback } from "react";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// Image generation models available via OpenRouter
const IMAGE_MODELS = {
  // Google Gemini Image (fast and reliable)
  gemini: "google/gemini-2.5-flash-image",
  // OpenAI GPT Image (high quality)
  gpt: "openai/gpt-5-image",
  // Auto-selection
  auto: "openrouter/auto",
};

// Primary model — Gemini Image via OpenRouter
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
        setError("OpenRouter API Key is missing. Please check your environment variables.");
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Try both standard and multimodal endpoints
        const endpoints = [
          "https://openrouter.ai/api/v1/images",
          "https://openrouter.ai/api/v1/images/generations"
        ];

        for (const endpoint of endpoints) {
          try {
            console.log(`Generating image via ${endpoint} with model ${DEFAULT_IMAGE_MODEL}...`);
            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": import.meta.env.VITE_SITE_URL || "https://enosx.vercel.app",
                "X-Title": "ENOSX AI",
              },
              body: JSON.stringify({
                model: DEFAULT_IMAGE_MODEL,
                prompt: prompt,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              const imageData = data?.data?.[0];

              if (imageData) {
                const result: ImageGenerationResult = {
                  url: imageData.url || (imageData.b64_json ? `data:image/png;base64,${imageData.b64_json}` : ""),
                  revisedPrompt: imageData.revised_prompt,
                };
                return result;
              }
            } else {
              const errData = await response.json().catch(() => ({}));
              console.warn(`Endpoint ${endpoint} failed:`, errData);
            }
          } catch (e) {
            console.error(`Error with endpoint ${endpoint}:`, e);
          }
        }

        // Final fallback to openrouter/auto
        console.log("Primary endpoints failed, trying fallback to openrouter/auto...");
        return await generateImageFallback(prompt);

      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("Image generation fatal error:", err);
        setError(`Image generation failed: ${msg}`);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Fallback: try auto-selection via OpenRouter
  const generateImageFallback = useCallback(
    async (prompt: string): Promise<ImageGenerationResult | null> => {
      const endpoints = [
        "https://openrouter.ai/api/v1/images",
        "https://openrouter.ai/api/v1/images/generations"
      ];

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer": import.meta.env.VITE_SITE_URL || "https://enosx.vercel.app",
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
        } catch (e) {
          // silent fail for individual fallback endpoints
        }
      }
      return null;
    },
    []
  );

  return {
    generateImage,
    isGenerating,
    error,
  };
}
