/*
 * ENOSX AI Assistant — useGlobalHotkey Hook
 * Global keyboard shortcut handler for Alt+Space to summon the app
 * Manages window visibility and focus state
 */

import { useEffect, useCallback } from "react";

interface UseGlobalHotkeyOptions {
  key: string; // e.g., "Alt+Space", "Ctrl+K"
  onTrigger: () => void;
}

export function useGlobalHotkey({ key, onTrigger }: UseGlobalHotkeyOptions) {
  const parseHotkey = useCallback((hotkeyStr: string) => {
    const parts = hotkeyStr.split("+").map((p) => p.trim().toLowerCase());
    return {
      ctrl: parts.includes("ctrl"),
      shift: parts.includes("shift"),
      alt: parts.includes("alt"),
      meta: parts.includes("meta"),
      key: parts[parts.length - 1],
    };
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const hotkey = parseHotkey(key);
      const eventKey = event.key.toLowerCase();

      const matchesModifiers =
        event.ctrlKey === hotkey.ctrl &&
        event.shiftKey === hotkey.shift &&
        event.altKey === hotkey.alt &&
        event.metaKey === hotkey.meta;

      const matchesKey =
        eventKey === hotkey.key ||
        eventKey === " " && hotkey.key === "space";

      if (matchesModifiers && matchesKey) {
        event.preventDefault();
        onTrigger();
      }
    },
    [key, parseHotkey, onTrigger]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);
}
