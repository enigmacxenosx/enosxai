# ENOSX AI Visual Story Studio

## Implementation approach
Add a first-class `/visual-story` route in the existing React/Vite app. The route is a self-contained storytelling workspace that turns a small table of labeled values into animated data scenes using the repository's existing `recharts` and `framer-motion` dependencies. It will support a chart mode switch, a three-beat narrative sequence, autoplay, a lightweight CSV editor, and visible summary metrics. No server or credential changes are required for the first release; the component is designed to accept real data later through the existing file/import flows.

## Project structure
- `enosx-app/src/pages/VisualStoryPage.tsx`: visual storytelling workspace, parsing, narrative scenes, chart rendering, controls.
- `enosx-app/src/components/Sidebar.tsx`: navigation entry point.
- `enosx-app/src/App.tsx`: route registration.
- `enosx-app/src/index.css`: story-studio layout, chart stage, controls, and reduced-motion styling.
- `enosx-app/public/manus-routes.json`: route manifest entry.

## Design
### Alternative styles
- **Editorial data cinema** (<0.10): quiet cream canvas, serif headlines, and documentary chart transitions.
- **Crimson Matrix observatory** (<0.10): obsidian glass, crimson-to-violet light, scanlines, and dashboard-grade data motion.
- **Neon field notebook** (<0.10): electric cyan, paper cards, sketch-like annotations, and playful kinetic markers.

### Chosen style: Crimson Matrix observatory
- **Design movement:** Cyberpunk glassmorphism with cinematic data visualization.
- **Core principles:** narrative before controls; high contrast; motion that explains change; sparse, purposeful chrome.
- **Color philosophy:** preserve ENOSX's obsidian/crimson identity, adding violet and cyan only to distinguish data series and create depth.
- **Layout paradigm:** an asymmetric story stage: narrative rail on the left, large visual canvas on the right, with a compact control strip below.
- **Signature elements:** glowing story-beat rail, animated scanline grid, metric callouts that pulse with scene changes.
- **Interaction philosophy:** every control advances understanding; autoplay behaves like a presentation mode, while chart and data controls stay discoverable.
- **Animation:** 450–700ms spring/fade transitions for scene changes; bars/areas animate on beat changes; ambient grid remains slow and subordinate; respect `prefers-reduced-motion`.
- **Typography system:** existing Eurostile/Inter UI font for controls, heavy tracking for labels, large tight numeric headlines for metrics.
- **Brand essence:** ENOSX AI turns raw information into clear, memorable stories for operators and builders. Precise, cinematic, inventive.
- **Brand voice:** direct and energetic. Example lines: “Turn the signal into a story.” / “Watch the pattern reveal itself.”
- **Wordmark & logo:** reuse the existing ENOSX brand mark and frame the feature with a small pulsing data-orbit motif.
- **Signature brand color:** ENOSX crimson `#dc143c`, used as the narrative accent and active-state signal.
