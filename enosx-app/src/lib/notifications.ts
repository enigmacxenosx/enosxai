export type EnosxNotification = {
  title: string;
  body: string;
  tag?: string;
  data?: Record<string, unknown>;
};

export const NOTIFICATION_PERMISSION_KEY = "enosx-notifications-enabled-v1";

export function canUseNotifications(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  return canUseNotifications() ? Notification.permission : "unsupported";
}

/**
 * The Web Notification API does not allow a custom audio file for background
 * notifications. This short two-tone EX signature is played when ENOSX is
 * active; the operating system supplies its normal notification sound when
 * the service worker displays a background notification.
 */
export function playEnosxExSound() {
  if (typeof window === "undefined" || !window.AudioContext) return;

  try {
    const AudioContextClass = window.AudioContext;
    const context = new AudioContextClass();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
    gain.connect(context.destination);

    const first = context.createOscillator();
    first.type = "sine";
    first.frequency.setValueAtTime(659.25, context.currentTime);
    first.connect(gain);
    first.start(context.currentTime);
    first.stop(context.currentTime + 0.14);

    const second = context.createOscillator();
    second.type = "triangle";
    second.frequency.setValueAtTime(1046.5, context.currentTime + 0.12);
    second.connect(gain);
    second.start(context.currentTime + 0.12);
    second.stop(context.currentTime + 0.32);

    window.setTimeout(() => void context.close(), 500);
  } catch {
    // Audio is an enhancement; notification delivery must still succeed.
  }
}

export async function requestEnosxNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!canUseNotifications()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    try {
      localStorage.setItem(NOTIFICATION_PERMISSION_KEY, "true");
    } catch {
      // Storage may be unavailable in private browsing.
    }
  }
  return permission;
}

export function sendEnosxNotification(notification: EnosxNotification, playSound = true): boolean {
  if (!canUseNotifications() || Notification.permission !== "granted") return false;

  if (playSound && document.visibilityState === "visible") {
    playEnosxExSound();
  }

  const payload = {
    ...notification,
    icon: "/favicon.png",
    badge: "/favicon.png",
    requireInteraction: false,
    silent: false,
  };

  void navigator.serviceWorker?.ready.then((registration) => {
    registration.showNotification(payload.title, payload);
  }).catch(() => {
    try {
      new Notification(payload.title, payload);
    } catch {
      // Notification delivery is best-effort when the browser blocks it.
    }
  });

  return true;
}
