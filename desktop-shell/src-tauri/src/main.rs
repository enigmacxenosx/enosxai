use serde::Serialize;
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
    .invoke_handler(tauri::generate_handler![propose_native_action])
    .run(tauri::generate_context!())
    .expect("error while starting ENOSX AI Desktop");
}
