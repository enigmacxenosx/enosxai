use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Manager, WindowEvent,
};

#[derive(Serialize)]
struct NativeActionProposal {
  kind: String,
  status: String,
  message: String,
}

#[derive(Deserialize, Serialize)]
struct LocalChatMessage {
  role: String,
  content: String,
}

/// Native capabilities are deliberately proposed, not executed. The web UI must
/// obtain an explicit user approval before a future release performs any OS action.
#[tauri::command]
fn propose_native_action(kind: String) -> NativeActionProposal {
  NativeActionProposal {
    kind,
    status: "approval_required".to_string(),
    message: "Review this action in ENOSX AI before granting desktop access.".to_string(),
  }
}

fn show_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
  }
}

fn hide_main_window(app: &AppHandle) {
  if let Some(window) = app.get_webview_window("main") {
    let _ = window.hide();
  }
}

fn local_ollama_url(base_url: &str) -> Result<reqwest::Url, String> {
  let url = reqwest::Url::parse(base_url.trim()).map_err(|_| "Enter a valid Ollama URL.".to_string())?;
  let is_loopback = matches!(url.host_str(), Some("localhost" | "127.0.0.1" | "::1" | "[::1]"));
  if url.scheme() != "http" || !is_loopback || !matches!(url.path(), "" | "/") || url.query().is_some() || url.fragment().is_some() {
    return Err("For privacy, ENOSX only connects to an Ollama server on this device (localhost).".to_string());
  }
  Ok(url)
}

#[tauri::command]
async fn list_local_models(base_url: String) -> Result<Vec<String>, String> {
  let url = local_ollama_url(&base_url)?;
  let endpoint = url.join("api/tags").map_err(|_| "Could not build the Ollama models URL.".to_string())?;
  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(10))
    .build()
    .map_err(|error| format!("Could not create local Ollama client: {error}"))?;
  let response = client.get(endpoint).send().await.map_err(|error| {
    format!("Could not reach Ollama on this device. Start Ollama and try again ({error}).")
  })?;
  if !response.status().is_success() {
    return Err(format!("Ollama returned HTTP {} while listing models.", response.status()));
  }
  let payload: serde_json::Value = response.json().await.map_err(|error| format!("Ollama returned an invalid model list: {error}"))?;
  let names = payload.get("models").and_then(|value| value.as_array()).ok_or_else(|| "Ollama did not return a models list.".to_string())?;
  Ok(names.iter().filter_map(|model| model.get("name").and_then(|name| name.as_str()).map(str::to_owned)).collect())
}

#[tauri::command]
async fn chat_with_local_model(
  base_url: String,
  model: String,
  messages: Vec<LocalChatMessage>,
) -> Result<String, String> {
  let url = local_ollama_url(&base_url)?;
  let model = model.trim();
  if model.is_empty() {
    return Err("Choose an installed Ollama model first.".to_string());
  }
  if messages.is_empty() || messages.len() > 200 {
    return Err("The local chat request must contain between 1 and 200 messages.".to_string());
  }
  let endpoint = url.join("api/chat").map_err(|_| "Could not build the Ollama chat URL.".to_string())?;
  let client = reqwest::Client::builder()
    .timeout(Duration::from_secs(300))
    .build()
    .map_err(|error| format!("Could not create local Ollama client: {error}"))?;
  let response = client
    .post(endpoint)
    .json(&serde_json::json!({ "model": model, "messages": messages, "stream": false }))
    .send()
    .await
    .map_err(|error| format!("Could not get a response from Ollama. Check that it is running and the model is installed ({error})."))?;
  if !response.status().is_success() {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    return Err(format!("Ollama returned HTTP {status}: {body}"));
  }
  let payload: serde_json::Value = response.json().await.map_err(|error| format!("Ollama returned an invalid chat response: {error}"))?;
  payload
    .pointer("/message/content")
    .and_then(|content| content.as_str())
    .map(str::to_owned)
    .ok_or_else(|| "Ollama returned no message content.".to_string())
}

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .setup(|app| {
      let show = MenuItem::with_id(app, "show", "Show ENOSX AI", true, None::<&str>)?;
      let hide = MenuItem::with_id(app, "hide", "Hide to tray", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "Quit ENOSX AI", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

      let mut tray = TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .tooltip("ENOSX AI")
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => show_main_window(app),
          "hide" => hide_main_window(app),
          "quit" => app.exit(0),
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            show_main_window(tray.app_handle());
          }
        });

      if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
      }
      tray.build(app)?;
      Ok(())
    })
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        api.prevent_close();
        let _ = window.hide();
      }
    })
    .invoke_handler(tauri::generate_handler![
      propose_native_action,
      list_local_models,
      chat_with_local_model
    ])
    .run(tauri::generate_context!())
    .expect("error while starting ENOSX AI Desktop");
}
