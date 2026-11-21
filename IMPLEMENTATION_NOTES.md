# ENOSX AI Current Implementation Notes

## Product identity

ENOSX is a multimodal AI agent workspace. User-facing copy uses “agent”; `assistant` remains only where required by the chat message protocol or legacy stored data.

## Active provider architecture

- Hosted chat and vision use server-side NVIDIA OpenAI-compatible endpoints.
- Image creation/editing uses the server-side NVIDIA FLUX.2 Klein handler.
- Video generation uses the server-side NVIDIA Cosmos3 Nano handler.
- Voice uses configured NVIDIA TTS providers, with browser speech fallback where supported.
- Provider credentials remain server-side and are never exposed through `VITE_` variables.

## Current workflow improvements

- Visual Story Studio turns labeled numeric CSV data into an animated three-beat narrative with area, bar, and line charts.
- Onboarding captures language, atmosphere, user preferences, and a primary use case.
- GitHub workspace displays the active account/repository/branch scope and defaults to read-only browsing. Write mode and action-specific confirmation are required before repository mutations.
- Image/video requests create durable browser-local media-job records. Media Library displays recent running, successful, and failed jobs with generated asset links.
- Chat activity timelines communicate processing state so users can see when the agent is thinking or an external workflow is running.

## Compatibility notes

The API transport still uses the OpenAI-compatible role values `user`, `assistant`, and `system`; these values must not be renamed in `Message` or provider payloads. Existing stored onboarding values of `assistant` are normalized to the new `agent` personality default.

## Validation commands

```bash
pnpm run typecheck
pnpm --filter @workspace/enosx-app test:unit
pnpm --filter @workspace/enosx-app build
```
