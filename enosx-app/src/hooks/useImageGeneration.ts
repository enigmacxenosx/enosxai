import { useState, useCallback } from "react";
import { toast } from "sonner";

interface ImageGenerationResult {
  url: string;
  revised_prompt?: string;
}

/**
 * Generates images through the server-side /api/image/generate Vercel
 * function. The NVIDIA API key lives on the server and is NEVER exposed
 * to the browser (the previous client-side implementation leaked the key
 * via a VITE_ variable and used provider credentials in the browser.
 *
 * Model selection, retries, and failover are handled server-side; see
 * api/image/generate.ts for the configured NVIDIA image model.
 */
export function useImageGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = useCallback(
    async (prompt: string): Promise<ImageGenerationResult | null> => {
      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch("/api/image/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
          let message = `Image generation failed (${response.status})`;
          try {
            const errData = await response.json();
            if (errData?.error) message = errData.error;
            if (errData?.status === "CONFIGURATION_ERROR") {
              message = "Image generation is not configured on the server.";
            }
          } catch {
            /* use default message */
          }
          setError(message);
          if (response.status !== 503) {
            toast.error(message);
          }
          return null;
        }

        const data = (await response.json()) as ImageGenerationResult;
        if (!data?.url) {
          setError("Image generation returned no image.");
          return null;
        }

        return {
          url: data.url,
          revised_prompt: data.revised_prompt,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Image generation failed.";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  return { generateImage, isGenerating, error };
}
