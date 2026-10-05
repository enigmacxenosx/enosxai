use serde::{Deserialize, Serialize};
use std::{path::Path, process::{Child, Command, Stdio}, sync::Mutex};
use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  AppHandle, Manager, State, WindowEvent,
};

#[derive(Serialize)]
struct NativeActionProposal {
  kind: String,
  status: String,
  message: String,
}

#[derive(Serialize, Clone)]
struct LocalServerStatus {
  running: bool,
  model_path: Option<String>,
  port: u16,
  pid: Option<u32>,
  message: String,
}

#[derive(Default)]
struct LocalServerState {
  child: Mutex<Option<Child>>,
  model_path: Mutex<Option<String>>,
  port: Mutex<u16>,
}

#[derive(Deserialize)]
struct StartLocalServerArgs {
  model_path: String,
  port: Option<u16>,
  context_length: Option<u32>,
  gpu_layers: Option<i32>,
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

fn current_status(state: &LocalServerState, message: String) -> LocalServerStatus {
  let mut child_guard = state.child.lock().expect("local server state poisoned");
  if let Some(child) = child_guard.as_mut() {
    match child.try_wait() {
      Ok(Some(_)) => {
        *child_guard = None;
      }
      Ok(None) => {}
      Err(_) => {}
    }
  }
  let running = child_guard.is_some();
  let pid = child_guard.as_ref().map(Child::id);
  let model_path = state.model_path.lock().expect("local model state poisoned").clone();
  let port = *state.port.lock().expect("local port state poisoned");
  LocalServerStatus { running, model_path, port, pid, message }
}

#[tauri::command]
fn local_server_status(state: State<'_, LocalServerState>) -> LocalServerStatus {
  current_status(&state, "Local model server status checked".to_string())
}

#[tauri::command]
fn start_local_server(
  args: StartLocalServerArgs,
  state: State<'_, LocalServerState>,
) -> Result<LocalServerStatus, String> {
  let model = Path::new(&args.model_path);
  if model.extension().and_then(|value| value.to_str()).map(|value| value.to_ascii_lowercase()) != Some("gguf".to_string()) {
    return Err("Please choose a .gguf model file.".to_string());
  }
  if !model.is_file() {
    return Err("The selected GGUF file does not exist or is not readable.".to_string());
  }

  {
    let mut child_guard = state.child.lock().map_err(|_| "Local server state is unavailable".to_string())?;
    if let Some(child) = child_guard.as_mut() {
      if child.try_wait().map_err(|error| error.to_string())?.is_none() {
        return Err("A local model server is already running. Stop it before choosing another model.".to_string());
      }
    }
    *child_guard = None;

    let binary = std::env::var("ENOSX_LLAMA_SERVER_BIN").unwrap_or_else(|_| "llama-server".to_string());
    let port = args.port.unwrap_or(8090).clamp(1024, 65535);
    let context_length = args.context_length.unwrap_or(8192).clamp(512, 131072);
    let gpu_layers = args.gpu_layers.unwrap_or(999);

    let child = Command::new(binary)
      .arg("-m").arg(model)
      .arg("--host").arg("127.0.0.1")
      .arg("--port").arg(port.to_string())
      .arg("-c").arg(context_length.to_string())
      .arg("-ngl").arg(gpu_layers.to_string())
      .arg("--jinja")
      .stdin(Stdio::null())
      .stdout(Stdio::null())
      .stderr(Stdio::null())
      .spawn()
      .map_err(|error| format!("Could not start llama-server. Install llama.cpp or set ENOSX_LLAMA_SERVER_BIN. {error}"))?;

    *child_guard = Some(child);
    *state.model_path.lock().map_err(|_| "Local model state is unavailable".to_string())? = Some(args.model_path);
    *state.port.lock().map_err(|_| "Local port state is unavailable".to_string())? = port;
  }

  Ok(current_status(&state, "Offline GGUF model server started".to_string()))
}

#[tauri::command]
fn stop_local_server(state: State<'_, LocalServerState>) -> Result<LocalServerStatus, String> {
  let mut child_guard = state.child.lock().map_err(|_| "Local server state is unavailable".to_string())?;
  if let Some(mut child) = child_guard.take() {
    child.kill().map_err(|error| format!("Could not stop llama-server: {error}"))?;
    let _ = child.wait();
  }
  drop(child_guard);
  Ok(current_status(&state, "Offline GGUF model server stopped".to_string()))
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

fn main() {
  tauri::Builder::default()
    .manage(LocalServerState::default())
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
      local_server_status,
      start_local_server,
      stop_local_server
    ])
    .run(tauri::generate_context!())
    .expect("error while starting ENOSX AI Desktop");
}
