# ENOSX AI Visual System Cleanup

## Implementation approach
Keep the ENOSX AI application permanently dark and remove visual-system features that made the interface theme-dependent or overly decorative. The cleanup removes theme switching, wallpaper rendering and controls, glass overlays, chip/pill effects, and message-bubble surfaces while preserving chat actions, media, attachments, feedback, and responsive layouts.

## Project structure
- `enosx-app/src/contexts/DarkModeContext.tsx`: single dark-mode configuration and root color-scheme initialization.
- `enosx-app/src/components/GlobalLayout.tsx`: opaque dark application shell shared by routed pages.
- `enosx-app/src/components/MessageRow.tsx`: unboxed message rendering, media, actions, feedback, and activity timelines.
- `enosx-app/src/components/FileContextPanel.tsx`: flat attached-file controls without badge treatment.
- `enosx-app/src/index.css`: dark-only tokens and flat controls; no wallpaper, light-theme, glass, chip, or bubble utilities.
- `README.md`: documents the permanent dark-mode contract for contributors.

## Design
- **Design movement:** focused dark workspace with restrained crimson accents.
- **Core principles:** legible hierarchy, opaque surfaces, rectangular controls, and consistent spacing.
- **Color philosophy:** use the ENOSX dark palette as the only application palette; crimson remains the action accent.
- **Layout paradigm:** preserve the existing responsive route structure while letting content and spacing define hierarchy instead of decorative surfaces.
- **Interaction philosophy:** keep useful suggestions, file actions, feedback, and proposed actions discoverable without pill or bubble styling.
- **Animation:** retain purposeful entrance and loading motion, while avoiding decorative glow, blur, and surface effects.
- **Brand essence:** ENOSX AI is a focused, capable dark workspace for chat, research, coding, media, and memory.
- **Signature brand color:** ENOSX crimson `#dc143c`.

## Validation
The frontend must type-check, pass unit tests, build for production, and keep every declared route free of stale imports or deleted visual-system components.
