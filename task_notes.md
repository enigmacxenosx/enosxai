
## Phase 4 COMPLETE (toggle shipped)
- Commit 459dca0: "Add split-screen on/off toggle, persisted in localStorage" pushed to main; Vercel deployed (assets/index-D3bD4Gpb.js)
- Live test on enosxai.vercel.app/workspace PASSED:
  - Toggle button visible in floating top bar: "Split: On" (neutral style)
  - Click -> switches to full chat, button shows "Split: Off" (accent style), toast "Split-screen disabled — full chat view"
  - Click again -> split screen restores with toast "Split-screen workspace enabled", button back to "Split: On"
- Implementation: SPLIT_PREF_KEY=enosx-workspace-split-enabled-v1 in localStorage; getInitialSplitEnabled() defaults true; toggleSplit() persists + sets activeTab; when splitEnabled=false only WorkspaceChatPane renders (Split tab excluded from render)

## Script console feature (Phase: verify live)
- Commit 1ee41eb pushed; Vercel deployed (assets/index-Bh90zkQU.js)
- Live check: /workspace shows "Run a script" shortcut in Assistant, dock has "Terminal" (Script Console) entry. Rendering OK.
- Remaining browser test: click Run a script shortcut -> Script Console opens; run hello.py; verify Pyodide output. Then ask AI to write+run a fibonacci python script to test create_script/run_script flow.
- Files: useScriptRuntime.ts, TerminalWindow.tsx (new); computerApps.ts (terminal app); ComputerWorkspace.tsx + WorkspaceComputerPane.tsx (+TerminalWindow); useCommandChain.ts (+create_script/run_script); WorkspaceChatPane.tsx (parser + prompt); WorkspacePage.tsx (mapAppId terminal + auto-open); CommandChainProgress.tsx (labels); AssistantWindow.tsx (shortcut); api/chat.ts (prompt)

## Live test finding (hello.py run)
- hello.py run completed: status "Done", exit code 0 ✓ — Pyodide executed it.
- BUG: printed output lines did NOT appear in the output panel ("Output will appear here when the script runs." still shown). Suspect: loadPyodide() was called inside run after store.runs created run with id but the script's run uses scriptId while stdout routing uses "__py__"?? Actually appendRunOutput called with runId scriptId in loadPyodide — correct. More likely race: run marked done before stdout events flushed to render, OR output div not re-scrolled / empty render because r.output joined? Need to inspect: in TerminalWindow output render uses r.output.map line-by-line; if run status became done quickly, maybe output array was captured. Verify with a new run; if still empty, fix routing (runPythonScript sets run done before stdout batches arrive) → add small flush delay or await nothing? stdout callback is synchronous in pyodide; the issue may be that setRun({...done}) and stdout appends are same microtask; React batches, should work. Alternative hypothesis: the earlier script.id lookup in appendRunOutput("__py__", ...) uses wrong id — wait, in loadPyodide I passed script.id: yes `script.id`. Hmm but run id IS script.id. Re-run and check; possibly Pyodide failed to load CDN (no pyodide output either way).
