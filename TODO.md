# ENOSX AI Visual Story Studio

## NVIDIA Image and Video Generation
- [ ] Generate images using NVIDIA's hosted FLUX.2 Klein 4B endpoint by default; retain optional custom image endpoint overrides and keep all NVIDIA credentials server-side.
- [ ] Generate short text-to-video clips and image-to-video clips using NVIDIA Cosmos3 Nano; render the returned MP4 inline in the chat and show a clear error when generation is unavailable or refused.
- [ ] Route image and video requests through one shared Vercel function while preserving `/api/image/generate` and `/api/video/generate`, keeping deployments within the Hobby limit of 12 serverless functions.
- [ ] Document required Vercel secrets and model choices, and validate the frontend and API packages with typecheck/build.

- [ ] Add a `/visual-story` page that lets users turn labeled numeric data into a visual narrative with a large animated chart stage.
  - The page must include a narrative heading, supporting explanation, summary metrics, and at least three story beats.
  - Story beat changes must update the visual state with purposeful animation and must work with reduced-motion preferences.
- [ ] Add chart mode controls for area, bar, and line views using the existing charting dependencies.
- [ ] Add a compact CSV editor/import surface so users can replace the sample data without leaving the story page.
- [ ] Add play/pause autoplay and beat navigation so the story can be presented as an animated sequence.
- [ ] Add the Visual Story Studio to ENOSX navigation and the static route manifest.
- [ ] Validate the ENOSX app with typecheck and production build; resolve actionable errors before delivery.


## Online Learning Media and Website Study
- [x] Recognize natural requests for online tutorial videos and pictures; fetch both media types when requested together and show inline pictures, source links, and playable/clickable videos.
- [x] Let users ask ENOSX AI to study a simple website from a supplied URL; ground the response in extracted page text and cite the page.
- [x] Keep website retrieval bounded and SSRF-resistant; treat retrieved page content as untrusted and report unavailable media/pages honestly.
- [x] Add starter prompts that demonstrate media search and website study.
- [x] Validate typecheck and production builds; inspect the changed diff before delivery.
- [ ] Confirm `TAVILY_API_KEY` is configured in the Vercel production environment so online web, image, and video-platform search can return live results.

## GitHub Actions CI Diagnostics
- [x] When GitHub is selected for the current chat and the user asks about CI, builds, or workflow status, inspect only the public repository already selected in the GitHub workspace using unauthenticated read-only requests; if GitHub is not selected, no Actions request is made, and private-repo results are reported unavailable.
- [x] Resolve the requested commit SHA or the selected/default branch head SHA, find runs that match that exact SHA, report the exact run ID/status/conclusion/link, and inspect its job and step conclusions.
- [x] Cross-check the run's workflow ID against repository workflow metadata and clearly distinguish successful, failed, queued/in-progress, missing, and inaccessible runs without inventing a cause.
- [x] Display diagnostic progress through commit resolution, run matching, job/step inspection, and workflow metadata verification; do not send any GitHub token and never perform GitHub writes or change OAuth scopes.
- [x] Keep GitHub API content bounded and explicitly labeled untrusted; validate the helper's matching, result-shaping, and failure behavior with focused tests.

## Direct Image Generation and Shared Workflow Activity
- [x] Route direct image-creation prompts from ordinary chat to the server-backed image generator without requiring Image mode; keep online image search and instructional prompts on their existing paths.
- [x] Show a shared per-message live activity timeline for image/video generation, ZIP creation, selected GitHub work, online-media search, webpage study, and assistant response generation, with outcomes based on returned results.
- [x] Include proposed Browser Bridge actions in the same timeline; retain the chat confirmation and per-action extension approval, and keep queued work in “waiting for approval” until the extension reports success, failure, or cancellation.
- [x] Normalize and bound persisted activity history; add focused unit tests for image-intent routing, event updates, and correlated browser outcomes.
- [x] Re-run all frontend unit tests, repository typechecks, production builds, and extension syntax checks; review the complete diff.
- [ ] Verify GitHub CI and Vercel deployment status after pushing this change to `main`.
