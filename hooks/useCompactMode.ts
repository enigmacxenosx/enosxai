import { useState, useCallback } from "react";

export function useCompactMode() {
  const [isCompactMode, setIsCompactMode] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const toggleCompactMode = useCallback(() => {
    setIsCompactMode((v) => !v);
  }, []);

  const toggleOverlay = useCallback(() => {
    setIsOverlayOpen((v) => !v);
  }, []);

  return {
    isCompactMode,
    isOverlayOpen,
    toggleCompactMode,
    toggleOverlay,
    setIsCompactMode,
    setIsOverlayOpen,
  };
}
