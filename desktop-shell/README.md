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

Use **Tauri 2** for the packaged desktop release. It offers a small native shell around the current `enosx-app` Vite frontend, uses explicit Rust-side commands for privileged work, and keeps the assistant’s public web deployment free from OS automation privileges. No desktop command should run directly from model output; the frontend must render each command as an explicit, user-reviewed proposal first.

## Downloadable installers

Download published installers from [GitHub Releases](https://github.com/enigmacxenosx/enosxai/releases/latest). Windows builds include `.msi` and `.exe`, macOS builds include `.dmg`, and Linux builds include `.AppImage` and `.deb` packages. The web app and desktop app share the same frontend. To build locally from the repository root, run `pnpm --dir desktop-shell install` followed by `pnpm --dir desktop-shell build:installer`. Tauri writes platform-specific bundles under `desktop-shell/src-tauri/target/release/bundle/`.

## Windows toolbar companion

The packaged desktop app adds an **ENOSX AI icon to the Windows notification area** (system tray). A left click brings the app to the front; the context menu provides **Show ENOSX AI**, **Hide to tray**, and **Quit ENOSX AI**. Closing the window hides it to the tray so the assistant remains available without keeping the full window open. The same tray behavior is included in macOS and Linux packages.

## Offline models

The desktop shell can chat with local models managed by [Ollama](https://ollama.com/). Install Ollama, pull a model once (for example, `ollama pull qwen3:4b`), then open **Settings → Offline models** and choose the installed model. Model weights are intentionally not included in the app installer, so users select and download a model separately. After that initial download, local chat works offline. In local mode the app calls Ollama through a native bridge restricted to loopback addresses; it does not fall back to the hosted chat API.

To publish installers automatically, create and push a version tag such as `v0.1.0`. The `Build ENOSX AI installers` GitHub Actions workflow builds Windows `.msi` and `.exe`, macOS `.dmg`, and Linux `.AppImage` and `.deb` packages, then attaches them to a published GitHub release. The workflow can also be started manually from the Actions tab by entering an existing version tag.

## Automatic updates

The desktop shell uses the signed Tauri updater. It checks the latest published GitHub Release at startup and asks the user before downloading and installing an update. Releases must be signed; the private signing key belongs only in the GitHub repository secret `TAURI_SIGNING_PRIVATE_KEY`, with its password in `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The updater public key is safe to commit in `src-tauri/tauri.conf.json` after generating it with `pnpm tauri signer generate`.
