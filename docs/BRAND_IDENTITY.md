# Enosx Technologies and ENOSX AI: Verified Product Profile

This document describes the current product and verified code behavior. Provider availability and UI behavior can change by deployment; do not treat model defaults as guarantees.

## Enosx Technologies

Enosx Technologies was founded in Nairobi, Kenya, in 2024 by Enosh Yeswa, its Founder and Chief Executive Officer. The company's stated product principle is “Speed is UX.” Its product portfolio includes ENOSX AI and the Enosx Tech Store, which offers technology products and digital services. The brand uses an Aero-Glass visual direction with translucent surfaces, blur, and iridescent accents.

Official company website: <https://enosxtech.vercel.app>.

## ENOSX AI chat tiers

The chat mode picker currently exposes these three tiers:

| User-facing name | Internal route ID | Intended response profile |
| --- | --- | --- |
| ENOSX One | `ex-core` | Fast everyday assistance |
| ENOSX Studio | `ex-pro` | Deeper expert and technical responses |
| ENOSX Nexus | `enosh-mind` | Strategic reasoning and complex analysis |

The tier names describe response profiles and model routing, not guaranteed correctness. Server-side NVIDIA NIM configuration selects the underlying model. One and Studio may have separate overrides, but both fall back to `NVIDIA_MODEL` and then `meta/muse-glimmer-30b` when no tier-specific override is set. Nexus uses `NVIDIA_ENOSH_MIND_MODEL` or defaults to `nvidia/nemotron-3-ultra-550b-a55b`. These are implementation defaults and can vary by deployment. Nexus is text-only; image input is routed through Studio vision by the application.

## Verified capabilities

- Chat with supported attachments, including common documents/PDFs, images, and audio/video files. Video understanding uses sampled visual context; an audio attachment is not automatically transcribed unless a transcription path actually runs.
- Generate or edit images and generate short videos when the corresponding provider is configured and returns a result.
- Search online content, including source-linked pictures and video-page links, when server-side `TAVILY_API_KEY` is configured. Image URLs may display inline; video search returns YouTube/Vimeo page links rather than guaranteed direct video streams.
- Use browser-supported microphone input and configured speech output.
- Use conversation history, local memory/knowledge features, and optional account sync where the relevant service is available.
- Select connectors per chat. Connector selection does not mean every operation is implemented or authorized.
- Use supported workspace actions and scripts. Browser click/fill interactions require explicit review and approval; some shell/batch script execution is simulated rather than run on the user's operating system.
- Use GitHub context and read-oriented repository/Actions analysis when GitHub is selected and available. General chat tools for editing repositories or pushing changes are not provided.

## Truthfulness rules for product answers

Describe capabilities based on the current implementation and runtime. State when credentials, service reachability, user approval, browser support, or file type limits a feature. Do not invent company facts, claim an action or generation/search succeeded without runtime evidence, imply unrestricted operating-system or browser access, or promise that a particular model is always used.
