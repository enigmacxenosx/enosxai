
## Phase 4 COMPLETE (toggle shipped)
- Commit 459dca0: "Add split-screen on/off toggle, persisted in localStorage" pushed to main; Vercel deployed (assets/index-D3bD4Gpb.js)
- Live test on enosxai.vercel.app/workspace PASSED:
  - Toggle button visible in floating top bar: "Split: On" (neutral style)
  - Click -> switches to full chat, button shows "Split: Off" (accent style), toast "Split-screen disabled — full chat view"
  - Click again -> split screen restores with toast "Split-screen workspace enabled", button back to "Split: On"
- Implementation: SPLIT_PREF_KEY=enosx-workspace-split-enabled-v1 in localStorage; getInitialSplitEnabled() defaults true; toggleSplit() persists + sets activeTab; when splitEnabled=false only WorkspaceChatPane renders (Split tab excluded from render)
