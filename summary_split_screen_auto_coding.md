# ENOSX AI Split-Screen Workspace & Auto Live Coding — Implementation Summary

**Date:** August 16, 2026 · **Repository:** `enigmacxenosx/enosxai` (branch `main`) · **Live site:** [enosxai.vercel.app](https://enosxai.vercel.app)

## What Was Built

The ENOSX AI chat application now includes a Manus-style split-screen workspace in which the conversation lives on the left and the **Enosx Computer** (a full desktop-mode workspace with a Script Console, Browser Tools, Files, and an assistant panel) lives on the right. Everything requested has been implemented, type-checked, built, and pushed to GitHub.

| # | Requirement | Status | How It Works |
|---|---|---|---|
| 1 | Split-screen workspace (chat left, Enosx Computer right) | **Done** | New `/workspace` route renders `ChatSplitLayout` — chat content in the left pane, `WorkspaceComputerPane` in the right pane, with a draggable divider |
| 2 | Toggle to turn split-screen on/off | **Done** | Toggle button in the header of both `/workspace` and `/` (Chat) pages; preference persisted in localStorage under `enosx-workspace-split-enabled-v1` and synced across pages |
| 3 | Standalone toggle directly on the Chat page | **Done** | "Split: On / Off" chip in the chat header, sharing state with the Workspace page through the shared `src/lib/splitPref.ts` module |
| 4 | No new tabs for proposed actions | **Done** | Action chips (e.g., "Launch terminal") execute in-pane within the Enosx Computer surface instead of opening browser tabs |
| 5 | Script support (Python, shell, batch) | **Done** | Script Console supports `.py` (real execution via Pyodide WebAssembly), `.sh` and `.bat` (labeled simulation, never touching your OS) |
| 6 | AI automatically displays its coding live in the Enosx Computer pane | **Done** | When split is on, the AI's replies are parsed for `[[ACTION: ...]]` blocks (`create_script`, `run_script`, `launch_app`); scripts are created in the Script Console, executed, and the terminal opens automatically — no clicking required |

## How the Auto Live-Coding Pipeline Works

The chat page embeds a `WorkspaceActionsController` inside the `ComputerWorkspaceProvider`, establishing two window-level broker functions (`__chatExecuteWorkspaceActions` and `__chatOpenWorkspaceWindow`) that the chat logic calls as soon as the AI response ends. Three cooperating mechanisms guarantee that coding shows up live regardless of how the AI formats its reply:

1. **Explicit action blocks** — `parseWorkspaceActions()` scans the streamed reply for `[[ACTION: create_script ...]]`, `[[ACTION: run_script ...]]`, and `[[ACTION: launch_app ...]]` blocks and executes them in order (this is what happened with the `hello_fib.py` fibonacci test).
2. **Proposed-action chips** — when the model instead emits a "Launch terminal" style action chip, a conversion loop in `handleSend` maps the chip to the matching workspace action (`launch_app` → terminal) and auto-executes it after the stream ends.
3. **Live Script Console sync** — the Script Console subscribes to a module-level script/run store, so every script the AI creates appears instantly in the pane, and every run streams its output to the terminal with an exit code. The terminal window also auto-focuses when actions run.

## Verification Results

All features were verified in a live browser session against the local build:

- **Fibonacci Python script** — asked the AI to write and run a first-10-fibonacci-numbers script; `hello_fib.py` was created automatically in the Script Console, appeared without any click, and the terminal opened on its own with the output.
- **Batch scripts** — the AI created `setup.bat` and `greet2.bat`; scripts render with proper formatting and run successfully (`✓ exited with code 0`, showing `Hello from Enosx` / `Batch scripts work`). Python scripts actually execute in the browser via WebAssembly; shell and batch run in a labeled Windows-style simulation.
- **Escaped-content fix** — script content with newlines (which some models double-escape inside JSON blocks) is now unescaped correctly before creation.
- **Split toggle** — persists across reloads, stays in sync between the Chat page and the `/workspace` page, and can be flipped off to return to full-width chat at any time.

One known minor nuance: if the model occasionally emits a "run" action before its "create" action has finished processing, the run can fail with "No script named X exists — create it first." Simply asking the AI to run the script again works, as the script is already present.

## Deployment Status

All code is committed and pushed to GitHub (`main`); the latest commits are `f8a7b69`, `ea100e7`, and `ab6fbae`. **Vercel is currently rate-limiting deployments for this account** (the live site still serves a build from before the final fixes). To see the newest version at `enosxai.vercel.app`, please go to the [Vercel dashboard](https://vercel.com), open the `enosxai` project, and click **Deploy** (or retry the most recent production deployment) on the **Deployments** tab. Once Vercel's rate limit lifts (roughly a 24-hour window), automatic redeployments from GitHub pushes will resume as normal.

| Commit | Description |
|---|---|
| `ab6fbae` | Auto-execute AI coding actions live in the computer pane when split is on |
| `ea100e7` | Auto-execute proposed actions (`launch_app` etc.) live in the computer pane when split is on |
| `f8a7b69` | Unescape double-escaped newlines in AI-created script content |
