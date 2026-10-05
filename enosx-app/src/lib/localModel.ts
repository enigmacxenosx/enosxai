import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export interface LocalModelStatus {
  running: boolean;
  modelPath?: string | null;
  port: number;
  pid?: number | null;
  message?: string;
}

export const isTauriDesktop = () => "__TAURI_INTERNALS__" in window;
const SAVED_MODEL_PATH_KEY = "enosx.localModelPath";

export function getSavedLocalModelPath() {
  return window.localStorage.getItem(SAVED_MODEL_PATH_KEY);
}

export function saveLocalModelPath(modelPath: string) {
  window.localStorage.setItem(SAVED_MODEL_PATH_KEY, modelPath);
}

export function startSavedLocalModel(modelPath: string) {
  return invoke<LocalModelStatus>("start_local_server", {
    modelPath,
    port: 8090,
    contextLength: 8192,
    gpuLayers: 999,
  });
}

export async function chooseAndStartLocalModel(): Promise<LocalModelStatus> {
  if (!isTauriDesktop()) {
    throw new Error("Open ENOSX AI Desktop to launch a local GGUF model. The browser version cannot start local processes.");
  }

  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "GGUF model", extensions: ["gguf"] }],
  });

  if (!selected || Array.isArray(selected)) {
    throw new Error("Model selection cancelled.");
  }

  saveLocalModelPath(selected);
  return startSavedLocalModel(selected);
}

export function stopLocalModel() {
  return invoke<LocalModelStatus>("stop_local_server");
}

export function getLocalModelStatus() {
  return invoke<LocalModelStatus>("local_server_status");
}
