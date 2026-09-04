use serde::Serialize;

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

fn main() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![propose_native_action])
    .run(tauri::generate_context!())
    .expect("error while starting ENOSX AI Desktop");
}
