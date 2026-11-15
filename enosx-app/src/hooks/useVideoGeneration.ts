import { useCallback, useState } from "react";
import { showError } from "@/lib/errorReporting";

interface VideoGenerationResult {
  url?: string;
  error?: string;
}

/** Calls the server-side Cosmos3 Nano endpoint. The NVIDIA key never reaches the browser. */
export function useVideoGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const generateVideo = useCallback(async (prompt: string, image?: string): Promise<VideoGenerationResult | null> => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ...(image ? { image } : {}) }),
      });
      if (!response.ok) {
        let message = `Video generation failed (${response.status})`;
        try {
          const data = await response.json();
          if (typeof data?.error === "string") message = data.error;
          if (data?.status === "CONFIGURATION_ERROR") message = "NVIDIA video generation is not configured on the server. Add NVIDIA_VIDEO_API_KEY or NVIDIA_API_KEY to the deployment environment.";
        } catch {
          // Keep the status-based message.
        }
        setError(message);
        if (response.status !== 503) showError(message);
        return { error: message };
      }
      const data = (await response.json()) as VideoGenerationResult;
      if (!data?.url?.startsWith("data:video/mp4;base64,")) {
        const message = "NVIDIA video generation returned no playable MP4.";
        setError(message);
        return { error: message };
      }
      return { url: data.url };
    } catch (err) {
      const message = err instanceof Error ? err.message : "NVIDIA video generation failed.";
      setError(message);
      showError(message);
      return { error: message };
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateVideo, isGenerating, error, clearError };
}
