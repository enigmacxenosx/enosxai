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


# ENOSX AI Online Learning Media and Website Study

## Implementation approach
Keep the experience inside the existing chat: natural requests for online tutorial videos and pictures should search both types when asked, render pictures inline with source links, and present videos as embeds when supported or clickable links otherwise. When a user explicitly asks to study, read, summarize, review, or explain a supplied HTTP(S) page, retrieve its readable text server-side and provide it to the current chat model as untrusted reference material. The model must cite the source and never treat webpage text as instructions.

## Project structure
- `enosx-app/src/lib/onlineResearch.ts`: media-intent detection, online result formatting, URL study request detection, and bounded chat-context helpers.
- `enosx-app/src/pages/ChatPage.tsx`: add the retrieved media/page context to the chat system prompt without changing the existing LLM provider.
- `enosx-app/src/components/WelcomeScreen.tsx`: add concrete starter prompts for finding learning media and studying a page.
- `lib/server/browser-read.ts`: validate public HTTP(S) targets, resolve and pin public DNS addresses, revalidate every redirect, cap response size/time/rate, and extract readable text.
- `api/browser.ts`: route legacy webpage reads through the same safe reader.

## Safety and behavior
- Fetch only user-supplied public HTTP(S) URLs on an explicit study request; never fetch model-generated links.
- Reject private, loopback, link-local, special-use, credential-bearing, and non-standard-port URLs. Revalidate redirects and pin the checked DNS results for each connection.
- Keep extracted page content bounded and label it untrusted. If a page or media search is unavailable, tell the user honestly instead of fabricating results.
- Preserve the existing chat provider and server-only search-provider configuration.
