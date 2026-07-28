import { useEffect, useCallback } from "react";

export function useGlobalSummon(onSummon: () => void) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Alt + Space to summon
      if (event.altKey && event.code === "Space") {
        event.preventDefault();
        onSummon();
      }

      // Cmd/Ctrl + Shift + E as alternative (for Mac and Windows)
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === "KeyE") {
        event.preventDefault();
        onSummon();
      }
    },
    [onSummon]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
