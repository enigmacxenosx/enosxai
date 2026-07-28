/*
 * ENOSX AI — useClipboardListener
 * Monitors clipboard copy events and exposes the latest copied text.
 * When the user copies text, a glowing icon appears in the UI.
 * Clicking it triggers AI summarization of the clipboard content.
 */
import { useState, useEffect, useCallback, useRef } from "react";

export interface ClipboardState {
  /** The most recently copied text (empty string if none) */
  copiedText: string;
  /** Whether the clipboard badge is currently visible */
  isVisible: boolean;
  /** Dismiss the badge without acting on the clipboard content */
  dismiss: () => void;
  /** Clear state after the user has acted on the content */
  consume: () => void;
}

const MIN_LENGTH = 10; // Only show badge for meaningful text
const AUTO_DISMISS_MS = 12_000; // Auto-dismiss after 12 s

export function useClipboardListener(): ClipboardState {
  const [copiedText, setCopiedText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, AUTO_DISMISS_MS);
  }, []);

  const dismiss = useCallback(() => {
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const consume = useCallback(() => {
    setIsVisible(false);
    setCopiedText("");
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    const handleCopy = async () => {
      try {
        // Use the Selection API first (synchronous, no permission needed)
        const selection = window.getSelection()?.toString().trim() ?? "";
        if (selection.length >= MIN_LENGTH) {
          setCopiedText(selection);
          setIsVisible(true);
          resetTimer();
          return;
        }
        // Fallback: read from clipboard API (requires focus + permission)
        if (navigator.clipboard && document.hasFocus()) {
          const text = await navigator.clipboard.readText();
          if (text.trim().length >= MIN_LENGTH) {
            setCopiedText(text.trim());
            setIsVisible(true);
            resetTimer();
          }
        }
      } catch {
        // Clipboard read permission denied — silently ignore
      }
    };

    document.addEventListener("copy", handleCopy);
    return () => {
      document.removeEventListener("copy", handleCopy);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  return { copiedText, isVisible, dismiss, consume };
}
