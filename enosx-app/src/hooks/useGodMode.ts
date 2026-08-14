/*
 * ENOSX AI — useGodMode
 * Global keyboard shortcut handler for GOD MODE.
 *
 * Supported shortcuts:
 * - Alt + X, then E (keys may be released between steps)
 * - Alt + E, then X
 * - Alt + X + E held together
 * - Control + E + X + C held together
 */
import { useCallback, useEffect, useRef } from "react";

const SEQUENCE_WINDOW_MS = 1200;
const TRIGGER_COOLDOWN_MS = 1000;

type SequenceState = {
  key: "KeyX" | "KeyE" | null;
  expiresAt: number;
};

export function useGodMode(onTrigger: () => void) {
  const pressedCodes = useRef<Set<string>>(new Set());
  const sequence = useRef<SequenceState>({ key: null, expiresAt: 0 });
  const lastTriggeredAt = useRef(0);

  const resetKeys = useCallback(() => {
    pressedCodes.current.clear();
    sequence.current = { key: null, expiresAt: 0 };
  }, []);

  const trigger = useCallback(() => {
    const now = Date.now();
    if (now - lastTriggeredAt.current < TRIGGER_COOLDOWN_MS) return;

    lastTriggeredAt.current = now;
    resetKeys();
    onTrigger();
  }, [onTrigger, resetKeys]);

  useEffect(() => {
    const hasAlt = () =>
      pressedCodes.current.has("AltLeft") || pressedCodes.current.has("AltRight");

    const hasControl = () =>
      pressedCodes.current.has("ControlLeft") || pressedCodes.current.has("ControlRight");

    const hasAll = (codes: string[]) => codes.every((code) => pressedCodes.current.has(code));

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;

      pressedCodes.current.add(event.code);
      const now = Date.now();
      const altHeld = hasAlt() || event.altKey;

      // Preserve the original held-key shortcut: Control + E + X + C.
      const controlShortcut = hasControl() && hasAll(["KeyE", "KeyX", "KeyC"]);

      if (altHeld && (event.code === "KeyX" || event.code === "KeyE")) {
        // Support both ordered forms: Alt+X then E and Alt+E then X.
        const previous = sequence.current;
        const orderedSequence =
          previous.expiresAt >= now &&
          ((previous.key === "KeyX" && event.code === "KeyE") ||
            (previous.key === "KeyE" && event.code === "KeyX"));

        if (orderedSequence || hasAll(["KeyX", "KeyE"])) {
          event.preventDefault();
          trigger();
          return;
        }

        sequence.current = {
          key: event.code,
          expiresAt: now + SEQUENCE_WINDOW_MS,
        };
      }

      if (controlShortcut) {
        event.preventDefault();
        trigger();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedCodes.current.delete(event.code);

      if (sequence.current.expiresAt < Date.now()) {
        sequence.current = { key: null, expiresAt: 0 };
      }
    };

    const handleBlur = () => resetKeys();

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [resetKeys, trigger]);
}

// Kept for compatibility with existing callers. GOD MODE is activated by the shortcut.
export function authorizeGodMode(token: string): boolean {
  if (token === "ENOSX_AUTHORIZED_2024") {
    localStorage.setItem("godmode_auth_token", token);
    return true;
  }
  return false;
}

export function revokeGodModeAccess(): void {
  localStorage.removeItem("godmode_auth_token");
}

export function isGodModeAuthorized(): boolean {
  return localStorage.getItem("godmode_auth_token") === "ENOSX_AUTHORIZED_2024";
}
