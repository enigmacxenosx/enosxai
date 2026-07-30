/*
 * ENOSX AI — useImageGeneration
 * Generates images using OpenAI DALL-E via OpenRouter or direct OpenAI API.
 * Falls back to text-to-image models available on OpenRouter.
 */

import { useState, useCallback } from "react";

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "";

// Image generation models available via OpenRouter or direct API
const IMAGE_MODELS = {
  // OpenAI DALL-E (via OpenRouter)
  dallE3: "openai/dall-e-3",
  // Stability AI (via OpenRouter — free tier available)
  stabilityLcm: "stability-ai/sdxl:free",
  // FLUX models (via OpenRouter)
  flux: "black-forest-labs/flux-1.1-pro",
};

// Primary model — DALL-E 3 via OpenRouter
const DEFAULT_IMAGE_MODEL = IMAGE_MODELS.dallE3;

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
        setError("API key not configured. Please set VITE_OPENROUTER_API_KEY.");
        return null;
      }

      setIsGenerating(true);
      setError(null);

      try {
        // Try DALL-E 3 via OpenRouter (returns a JSON response with the image)
        const response = await fetch(
          "https://openrouter.ai/api/v1/images/generations",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${OPENROUTER_API_KEY}`,
              "HTTP-Referer":
                import.meta.env.VITE_SITE_URL || "https://enosx.vercel.app",
              "X-Title": "ENOSX AI",
            },
            body: JSON.stringify({
              model: DEFAULT_IMAGE_MODEL,
              prompt: prompt,
              n: 1,
              size: "1024x1024",
              quality: "standard",
            }),
          }
        );

        if (!response.ok) {
          let errData: any = {};
          try {
            errData = await response.json();
          } catch {
            /* ignore */
          }

          const errorMsg =
            errData?.error?.message || errData?.error || `API error: ${response.status}`;

          // If DALL-E fails, try the free Stability AI model as fallback
          if (response.status === 400 || response.status === 403) {
            return await generateImageFallback(prompt);
          }

          throw new Error(errorMsg);
        }

        const data = await response.json();
        const imageData = data?.data?.[0];

        if (!imageData) {
          throw new Error("No image data in response");
        }

        const result: ImageGenerationResult = {
          url: imageData.url || "",
          revisedPrompt: imageData.revised_prompt,
        };

        // If we got base64 instead of URL
        if (imageData.b64_json) {
          result.base64 = `data:image/png;base64,${imageData.b64_json}`;
          result.url = result.base64;
        }

        return result;
      } catch (err) {
        // Try fallback if primary model fails
        try {
          return await generateImageFallback(prompt);
        } catch (fallbackErr) {
          const msg = err instanceof Error ? err.message : "Unknown error";
          setError(`Image generation failed: ${msg}`);
          return null;
        }
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Fallback: try Stability AI (free tier) via OpenRouter
  const generateImageFallback = useCallback(
    async (prompt: string): Promise<ImageGenerationResult | null> => {
      const response = await fetch(
        "https://openrouter.ai/api/v1/images/generations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${OPENROUTER_API_KEY}`,
            "HTTP-Referer":
              import.meta.env.VITE_SITE_URL || "https://enosx.vercel.app",
            "X-Title": "ENOSX AI",
          },
          body: JSON.stringify({
            model: IMAGE_MODELS.stabilityLcm,
            prompt: prompt,
            n: 1,
            size: "1024x1024",
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Fallback image generation failed: ${response.status}`);
      }

      const data = await response.json();
      const imageData = data?.data?.[0];

      if (!imageData) {
        throw new Error("No image data in fallback response");
      }

      return {
        url: imageData.url || imageData.b64_json
          ? imageData.url || `data:image/png;base64,${imageData.b64_json}`
          : "",
      };
    },
    []
  );

  return { generateImage, isGenerating, error };
}
