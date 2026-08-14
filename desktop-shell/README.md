# ENOSX AI Desktop Shell

This directory is the desktop-integration boundary for ENOSX AI. It is intentionally separated from the web application so OS capabilities are granted explicitly, reviewed per release, and never exposed to browser code.

## Planned Native Capabilities

| Capability | Permission Boundary |
|---|---|
| Active-window context | Explicit operating-system permission and per-app allow list |
| Open approved applications | User-approved action proposal; executable allow list |
| File context | User-selected files or workspace roots only |
| Notifications and tray controls | Local-only desktop integration |

## Implementation Choice

Use **Tauri 2** for a future packaged desktop release. It offers a small native shell around the current `enosx-app` Vite frontend, uses explicit Rust-side commands for privileged work, and keeps the assistant’s public web deployment free from OS automation privileges. No desktop command should run directly from model output; the frontend must render each command as an explicit, user-reviewed proposal first.
