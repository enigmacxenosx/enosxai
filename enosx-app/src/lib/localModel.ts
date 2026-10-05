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

  return invoke<LocalModelStatus>("start_local_server", {
    modelPath: selected,
    port: 8090,
    contextLength: 8192,
    gpuLayers: 999,
  });
}

export function stopLocalModel() {
  return invoke<LocalModelStatus>("stop_local_server");
}

export function getLocalModelStatus() {
  return invoke<LocalModelStatus>("local_server_status");
}
