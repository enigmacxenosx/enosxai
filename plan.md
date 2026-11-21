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


## NVIDIA Image and Video Generation

### Implementation approach
Keep NVIDIA credentials server-side. Use NVIDIA-hosted FLUX.2 Klein 4B for image generation and Cosmos3 Nano for short text-to-video or image-to-video clips. The Vercel Hobby deployment allows at most 12 serverless functions, so preserve the public image/video paths with rewrites to one shared API function and keep the two provider handlers outside the Vercel `api/` entrypoint directory.

### Project structure
- `api/generate.ts`: dispatch the rewritten image and video paths to the appropriate server-side handler.
- `api-handlers/image-generate.ts`: NVIDIA FLUX image generation, existing compatibility behavior, and watermarking.
- `api-handlers/video-generate.ts`: NVIDIA Cosmos3 Nano text-to-video and image-to-video generation.
- `vercel.json`: map the existing image/video URLs to the shared function and apply its 120-second limit.
- `api-server/src/routes/image.ts` and `api-server/src/routes/video.ts`: keep the alternate Express deployment paths behaviorally consistent.


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

# GitHub Actions CI Diagnostics
## Implementation approach
When the user selects GitHub for a chat and asks about CI/build/workflow status, read only the public repository already selected in the GitHub workspace. Use unauthenticated, read-only GitHub Actions REST endpoints; private repositories remain unsupported until repository-scoped authorization is available. Resolve an explicitly supplied commit SHA or selected/default branch head SHA, find Actions runs for that exact SHA, inspect the selected run plus job/step conclusions, and cross-check its workflow ID against repository workflow metadata. Show progress through the four diagnostic phases and provide only bounded, labeled evidence to the model as untrusted data. No token is sent to GitHub, ENOSX, or the model, and no GitHub writes or OAuth scope changes are introduced.
## Project structure
- `enosx-app/src/lib/githubActions.ts`: detect CI-status requests, validate the selected repository, query public GitHub read-only APIs without credentials, and return bounded structured evidence plus phase updates.
- `enosx-app/src/pages/ChatPage.tsx`: invoke the diagnostic only for a GitHub-selected CI request, display progress, and include its evidence in the request-specific system context.
- `enosx-app/src/components/MessageBubble.tsx` and `enosx-app/src/lib/types.ts`: persist and render the accessible four-phase diagnostic run log on the assistant reply.
- `enosx-app/src/lib/githubActions.test.ts`: cover commit resolution, exact run matching, failed-job/step capture, metadata verification, and access/error boundaries.
## Safety and behavior
- Never query GitHub unless GitHub is selected for the current message; require a repository selected in the GitHub workspace and access only its public data.
- Use only the selected repository and a branch/commit requested by the user or its default branch. Do not use or transmit any OAuth token; if GitHub reports the repository or run is not publicly accessible, say so.
- Treat API-returned names, titles, and descriptions as untrusted evidence. Do not infer causes beyond returned status/job/step metadata, and do not claim success when the run is absent, pending, or inaccessible.

# Direct Image Generation and Shared Workflow Activity
## Implementation approach
Keep ordinary chat as the default entry point for direct image creation: detect natural creation phrasing in the prompt and route it to the existing server-side image endpoint without requiring a separate Image mode. Leave online image searches, tutorials, and other non-generation requests on their existing chat/search paths. Use the same accessible activity event shape for all user-visible work rather than treating GitHub CI as a special-only timeline.

## Activity coverage and reporting
- Report image/video generation, ZIP creation, GitHub diagnostics and selected GitHub context, online-media search, webpage study, and the assistant response as bounded message-level activity events with live status and concise operation details.
- Persist and normalize only validated activity IDs, labels, statuses, details, and timestamps; cap event count and text lengths.
- Correlate proposed browser actions to their source assistant message. A chat-side confirmation may queue an action, but the timeline must remain “waiting for approval” until the extension popup receives the user’s per-action approval and reports success, failure, or cancellation. Never indicate the browser action ran merely because it was queued.

## Validation
- Unit-test natural direct-image phrasing separately from online search/instruction prompts; test event normalization/upsert limits and browser-result correlation/status validation.
- Run frontend unit tests, repository typechecks, and a production frontend build. Review the final diff and validate the merged `main` CI/deployment status before reporting delivery.
