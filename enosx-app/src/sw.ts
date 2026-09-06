// @ts-nocheck
import { clientsClaim } from "workbox-core";
import { precacheAndRoute } from "workbox-precaching";

precacheAndRoute(self.__WB_MANIFEST);
clientsClaim();

const DEFAULT_ICON = "/favicon.png";

function normalizePayload(raw: unknown) {
  const value = typeof raw === "object" && raw !== null ? raw : {};
  return {
    title: typeof value.title === "string" ? value.title : "ENOSX AI",
    body: typeof value.body === "string" ? value.body : "ENOSX AI has an update for you.",
    tag: typeof value.tag === "string" ? value.tag : "enosx-ai",
    icon: typeof value.icon === "string" ? value.icon : DEFAULT_ICON,
    badge: typeof value.badge === "string" ? value.badge : DEFAULT_ICON,
    data: typeof value.data === "object" && value.data !== null ? value.data : {},
  };
}

self.addEventListener("push", (event) => {
  let raw = {};
  try {
    raw = event.data ? event.data.json() : {};
  } catch {
    raw = { body: event.data?.text?.() ?? "ENOSX AI has an update for you." };
  }

  const payload = normalizePayload(raw);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
      silent: false,
    }),
  );
});

self.addEventListener("message", (event) => {
  if (!event.data || event.data.type !== "ENOSX_SHOW_NOTIFICATION") return;
  const payload = normalizePayload(event.data.payload);
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      tag: payload.tag,
      icon: payload.icon,
      badge: payload.badge,
      data: payload.data,
      silent: false,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      const targetUrl = event.notification.data?.url || self.registration.scope;
      const existing = clientList.find((client) => "focus" in client);
      if (existing) {
        existing.navigate(targetUrl);
        return existing.focus();
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
