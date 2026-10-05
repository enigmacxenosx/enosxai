import { invoke } from "@tauri-apps/api/core";

export const LOCAL_MODEL_SETTINGS_KEY = "enosx-local-model-settings";

export type LocalModelSettings = {
  enabled: boolean;
  baseUrl: string;
  model: string;
};

export type LocalChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export const DEFAULT_LOCAL_MODEL_SETTINGS: LocalModelSettings = {
  enabled: false,
  baseUrl: "http://127.0.0.1:11434",
  model: "",
};

export function isDesktopShell() {
  return typeof window !== "undefined" && Boolean(
    (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}

export function readLocalModelSettings(): LocalModelSettings {
  try {
    const saved = localStorage.getItem(LOCAL_MODEL_SETTINGS_KEY);
    if (!saved) return DEFAULT_LOCAL_MODEL_SETTINGS;
    const parsed = JSON.parse(saved) as Partial<LocalModelSettings>;
    return {
      enabled: parsed.enabled === true,
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : DEFAULT_LOCAL_MODEL_SETTINGS.baseUrl,
      model: typeof parsed.model === "string" ? parsed.model : "",
    };
  } catch {
    return DEFAULT_LOCAL_MODEL_SETTINGS;
  }
}

export function saveLocalModelSettings(settings: LocalModelSettings) {
  localStorage.setItem(LOCAL_MODEL_SETTINGS_KEY, JSON.stringify(settings));
}

export function listLocalModels(baseUrl: string) {
  return invoke<string[]>("list_local_models", { baseUrl });
}

export function chatWithLocalModel(baseUrl: string, model: string, messages: LocalChatMessage[]) {
  return invoke<string>("chat_with_local_model", { baseUrl, model, messages });
}
