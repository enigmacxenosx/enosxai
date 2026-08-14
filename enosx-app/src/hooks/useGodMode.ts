/*
 * ENOSX AI — useGodMode
 * Detects authorized GOD MODE keyboard sequences.
 *
 * Supported sequences:
 * - Control/Meta + E + X + C
 * - Alt + E + X
 *
 * The detector accepts both held-key chords and normal sequential key presses
 * so it works consistently across browsers and keyboard layouts.
 */
import { useEffect, useRef, useCallback } from "react";

const GOD_MODE_AUTH_TOKEN = "ENOSX_AUTHORIZED_2024";

const isGodModeAuthorized = (): boolean => {
  const authToken = localStorage.getItem("godmode_auth_token");
  const isAuthorized = authToken === GOD_MODE_AUTH_TOKEN;

  if (!isAuthorized) {
    console.warn("[GODMODE] Unauthorized access attempt blocked");
  }

  return isAuthorized;
};

const normalizeKey = (key: string) => (key.length === 1 ? key.toLowerCase() : key);

export function useGodMode(onTrigger: () => void) {
  const pressedKeys = useRef<Set<string>>(new Set());
  const recentKeys = useRef<string[]>([]);

  const checkSequence = useCallback(
    (key?: string) => {
      const hasKeys = (keys: string[]) =>
        keys.every((candidate) =>
          pressedKeys.current.has(candidate) ||
          pressedKeys.current.has(candidate.toLowerCase()) ||
          pressedKeys.current.has(candidate.toUpperCase()),
        );

      if (key) {
        recentKeys.current = [...recentKeys.current, normalizeKey(key)].slice(-4);
      }

      const recent = recentKeys.current.join("+");
      const sequentialPrimary = recent.endsWith("Control+e+x+c") || recent.endsWith("Meta+e+x+c");
      const sequentialAlternative = recent.endsWith("Alt+e+x") || recent.endsWith("Alt+x+e");
      const heldPrimary = (pressedKeys.current.has("Control") || pressedKeys.current.has("Meta")) && hasKeys(["e", "x", "c"]);
      const heldAlternative = pressedKeys.current.has("Alt") && hasKeys(["e", "x"]);

      if ((sequentialPrimary || sequentialAlternative || heldPrimary || heldAlternative) && isGodModeAuthorized()) {
        onTrigger();
        pressedKeys.current.clear();
        recentKeys.current = [];
      }
    },
    [onTrigger],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      pressedKeys.current.add(event.key);
      checkSequence(event.key);
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      pressedKeys.current.delete(event.key);
    };

    const handleBlur = () => {
      pressedKeys.current.clear();
      recentKeys.current = [];
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, [checkSequence]);
}

export function authorizeGodMode(token: string): boolean {
  if (token === GOD_MODE_AUTH_TOKEN) {
    localStorage.setItem("godmode_auth_token", token);
    console.log("[GODMODE] Authorization successful");
    return true;
  }

  console.error("[GODMODE] Invalid authorization token");
  return false;
}

export function revokeGodModeAccess(): void {
  localStorage.removeItem("godmode_auth_token");
  console.log("[GODMODE] Access revoked");
}
