# Enosx Computer Implementation Plan

## Status

Implemented the first web workspace milestone on the `main` branch. The work is intentionally route-level and does not replace the chat experience or add native operating-system capabilities.

## Implemented decisions

| Area | Final decision |
| --- | --- |
| Entry point | Add a lazy-loaded `/computer` route and keep `/` as the existing chat route. |
| Composition | Render the workspace inside `GlobalLayout` so wallpaper, blur, opacity, theme, and the background picker remain shared. |
| Window state | Add a dedicated `ComputerWorkspaceContext` with persisted geometry, lifecycle state, active-window focus, z-order, launcher state, reset behavior, and viewport clamping. |
| Applications | Provide Assistant, Browser Tools, GitHub Workspace, Files, and Workspace Settings in a typed app registry. |
| Interaction | Support focus, drag, resize, minimize, maximize, restore, close, dock launch, searchable launcher, and `Ctrl/Cmd + K`. |
| Responsive behavior | Use a single full-screen active window in compact phone/tablet mode rather than shrinking overlapping desktop windows. |
| Browser behavior | Reuse the existing read-only browser hook for webpage reading and link extraction. Modifying actions remain outside the window and review-gated by the existing action system. |
| GitHub behavior | Keep repository operations in the existing GitHub panel flow and use the computer window as a clear handoff surface rather than duplicating the editor and push logic. |
| File behavior | Accept only files explicitly selected by the user. Unrestricted filesystem browsing remains out of scope. |
| Persistence | Store a versioned workspace layout in local storage and expose a reset-layout action. |
| Native boundary | Do not launch processes, browse the operating-system filesystem, execute arbitrary terminal commands, or infer privileged behavior from model output. |

## Live smoke test

The development server rendered `/computer` successfully after the existing splash screen completed. The page showed the workspace status bar, Assistant and Browser Tools windows, browser read-only controls, application dock, and launcher button without a runtime error. The route is therefore verified at the browser-render level in addition to passing TypeScript and production build checks. The live dock smoke test also opened the GitHub Workspace and Workspace Settings windows, confirmed focus changes and window chrome, and displayed the existing GitHub handoff plus layout reset controls.

## Validation commands

```text
pnpm --filter @workspace/enosx-app typecheck
pnpm --filter @workspace/enosx-app build
```

Both commands completed successfully. The Vite build emitted only the repository’s existing sourcemap warning for `src/components/ui/tooltip.tsx`; it did not prevent the production bundle from being generated.

## Follow-up milestones

The next increment can host the existing GitHub panel body directly inside window chrome, connect assistant messages to workspace context, add reducer/component tests, and persist dock preferences. Native desktop integration should continue through the separate permissioned desktop boundary rather than through this web route.
