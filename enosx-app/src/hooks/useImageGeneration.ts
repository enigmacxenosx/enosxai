import { useState, useCallback } from "react";
import { toast } from "sonner";

interface ImageGenerationResult {
  url?: string;
  revised_prompt?: string;
  error?: string;
}

/**
 * Calls the server-side /api/image/generate Vercel function.
 * NVIDIA credentials stay on the server and are never exposed to the browser.
 */
export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const generateImage = useCallback(
    async (prompt: string, image?: string): Promise<ImageGenerationResult | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch("/api/image/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, ...(image ? { image, mode: "img2img" } : {}) }),
        });

        if (!response.ok) {
          let message = `Image generation failed (${response.status})`;
          try {
            const errData = await response.json();
            if (errData?.error) message = errData.error;
            if (errData?.status === "CONFIGURATION_ERROR") {
              message = "NVIDIA image generation is not configured on the server.";
            }
            if (errData?.status === "MISSING_IMAGE") {
              message = "Attach an image before using this image-edit model.";
            }
          } catch {
            /* use default message */
          }
          setError(message);
          if (response.status !== 503) {
            toast.error(message);
          }
          return { error: message };
        }

        const data = (await response.json()) as ImageGenerationResult;
        if (!data?.url) {
          const message = "NVIDIA image generation returned no image.";
          setError(message);
          return { error: message };
        }

        return {
          url: data.url,
          revised_prompt: data.revised_prompt,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "NVIDIA image generation failed.";
        setError(message);
        toast.error(message);
        return { error: message };
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generateImage, isGenerating, error, clearError };
}
