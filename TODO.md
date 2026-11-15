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
- [ ] Confirm `SERPER_API_KEY` is configured for the Vercel production environment so online image/video search can return live results.
