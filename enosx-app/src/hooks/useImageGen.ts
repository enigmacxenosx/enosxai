import { useState, useCallback } from "react";

export function useImageGen() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateImage = useCallback(async (prompt: string) => {
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
        const errData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errData.error || `Error ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].url; // OpenAI returns an array of data objects with urls
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate image";
      setError(msg);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { generateImage, isGenerating, error };
}
