import { useCallback, useState } from "react";
import { showError } from "@/lib/errorReporting";

interface UpscaleResult { url?: string; error?: string }

export function useVideoUpscaling() {
  const [isUpscaling, setIsUpscaling] = useState(false);
  const upscaleVideo = useCallback(async (file: File): Promise<UpscaleResult> => {
    setIsUpscaling(true);
    try {
      const form = new FormData();
      form.append("video", file, file.name);
      const response = await fetch("/api/video/upscale", { method: "POST", body: form });
      const data = await response.json().catch(() => ({})) as UpscaleResult;
      if (!response.ok) {
        const error = data.error || `Video upscaling failed (${response.status}).`;
        showError(error);
        return { error };
      }
      if (!data.url) return { error: "The VSR service returned no result URL." };
      return data;
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "Video upscaling failed.";
      showError(error);
      return { error };
    } finally {
      setIsUpscaling(false);
    }
  }, []);
  return { isUpscaling, upscaleVideo };
}
