# ENOSX AI

**A multimodal AI agent by [Enosx Technologies](https://github.com/enigmacxenosx).** ENOSX AI is a responsive web application with a companion Tauri desktop shell, configurable AI services, and optional account sync and integrations.

[![Live app](https://img.shields.io/badge/Live%20app-enosxai.vercel.app-16a34a?style=for-the-badge)](https://enosxai.vercel.app)
[![Latest release](https://img.shields.io/github/v/release/enigmacxenosx/enosxai?style=for-the-badge)](https://github.com/enigmacxenosx/enosxai/releases/latest)

> The production web app and its `/api/healthz` endpoint were responding successfully when this README was updated. Features that depend on third-party providers are available only when those providers are configured and reachable.

## What it can do

- **Chat in three modes:** **ENOSX One** for fast everyday assistance, **ENOSX Studio** for deeper responses, and **ENOSX Nexus** for strategic reasoning and analysis. Model routing is configured server-side; the selected model and provider determine actual performance and availability.
- **Action-aware tier guidance:** the app recommends the most suitable tier for coding, research, images, strategy, science, and other high-confidence request categories, then notifies the user without silently changing the selected mode. See [the model tier policy](docs/model-tier-policy.md).
- **Analyze attachments:** work with common documents and PDFs, images, and audio/video files. Image and video analysis uses sampled visual context; audio-file analysis provides available file and waveform details, not an automatic transcript.
- **Create media:** generate images from prompts and edit images, and generate short videos from text or image input when the configured NVIDIA services allow it.
- **Upscale video:** optionally send small uploaded clips through an NVIDIA Video Super Resolution NIM bridge. This requires a separately deployed GPU-backed NIM and HTTP-to-gRPC bridge; see the setup guide before enabling it.
- **Search and study online content:** optionally search the web and find source-linked images, or search YouTube/Vimeo pages for video links. Search requires the server-side `TAVILY_API_KEY`. Tavily does not provide a dedicated video-search endpoint here, so video results are web links filtered to supported video platforms. Website reading is limited to public static HTML/text; protected or JavaScript-only pages may not be readable.
- **Use voice:** microphone speech input where the browser supports it, plus spoken responses through configured speech providers.
- **Continue after a reply:** get three locally selected follow-up prompt suggestions after a completed answer. The suggestions use the current exchange to choose a helpful prompt set without making another model request.
- **Rate answer quality:** rate completed agent replies from one to five stars using **“How was this result?”**. Ratings are saved locally and submitted to the feedback endpoint when delivery is configured; conversation text is not included.
- **Branch a conversation:** start a separate chat from a completed agent reply. The new chat copies the conversation only through that reply, preserves the original, and records which conversation/message it branched from.
- **Keep useful context:** use conversation history, a knowledge bank, and long-term memory. Guest data stays on the device; signed-in users can sync supported profile, chat, and memory data through Firebase.
- **Connect services:** the chat interface includes GitHub, Shopify, Vercel, and Email connector options. A connector's actual operations require its server-side integration and credentials to be configured; selecting a connector is scoped to that request.
- **Work with developer tools:** use code review and the developer/GOD MODE lab tools for coding and authorized learning workflows.
- **Use the desktop app:** the Tauri shell supports local chat models through Ollama, with installers and signed updates published through GitHub Releases when available.

## Live products

| Product | Link |
|---|---|
| ENOSX AI web app | [enosxai.vercel.app](https://enosxai.vercel.app) |
| Desktop installers | [Latest GitHub release](https://github.com/enigmacxenosx/enosxai/releases/latest) |
| Enosx Technologies | [Official website](https://enosxtech.vercel.app) |
| Enosx e-commerce hub | [enosxtech-hub.vercel.app](https://enosxtech-hub.vercel.app) |

Desktop availability depends on the published release assets for your operating system. Check the release page for current downloads.

## Interface appearance

ENOSX AI uses a permanent dark mode. Theme switching, wallpaper controls, wallpaper assets, glass overlays, chip effects, and message-bubble surfaces have been removed from the application. Suggestions, attached files, actions, and messages use flat, rectangular controls with clear borders and spacing. The dark palette is initialized by `enosx-app/src/contexts/DarkModeContext.tsx` and applies consistently across every route.

## Technology and repository layout

The project is a pnpm monorepo built around React, Vite, and TypeScript. It includes Vercel serverless API functions, shared libraries, and a Tauri desktop shell.

| Path | Purpose |
|---|---|
| `enosx-app/` | React + Vite web application, UI, and frontend tests |
| `api/` | Vercel serverless endpoints for chat and supporting services |
| `api-handlers/` | Shared generation and request handlers |
| `api-server/` | Express API service |
| `desktop-shell/` | Tauri desktop application and local-model bridge |
| `lib/` | Shared API clients, schemas, database, and server utilities |
| `docs/` | Setup, architecture, and operational documentation |
| `scripts/` | Build and project utility scripts |

## Run locally

### Prerequisites

- Node.js 24 or later
- pnpm 9
- An NVIDIA API key for hosted chat; other features need their corresponding provider configuration

```bash
git clone https://github.com/enigmacxenosx/enosxai.git
cd enosxai
pnpm install

# Start the web frontend
pnpm --filter @workspace/enosx-app dev
```

Configure local server environment variables for the API functions if you need hosted AI features. Follow [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) and use [`enosx-app/.env.example`](enosx-app/.env.example) as a reference. Do not commit real credentials. The production deployment is configured by [`vercel.json`](vercel.json).

### Checks

```bash
pnpm run typecheck
pnpm --filter @workspace/enosx-app test:unit
pnpm --filter @workspace/enosx-app build
pnpm test:orchestrator
```

The repository's CI workflow also type-checks the API services, runs browser regression tests, and checks the desktop shell. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Configuration

The web UI can load without all optional integrations, but server-backed features need their provider credentials configured in the server/deployment environment. Names below are configuration keys, not values to publish.

| Capability | Configuration |
|---|---|
| Hosted chat and text models | `NVIDIA_API_KEY`; optional model overrides include `NVIDIA_MODEL`, `NVIDIA_EX_CORE_MODEL`, `NVIDIA_EX_PRO_MODEL`, and `NVIDIA_ENOSH_MIND_MODEL` |
| Vision routing | `NVIDIA_VISION_MODEL`, `NVIDIA_EX_CORE_VISION_MODEL`, and `NVIDIA_EX_PRO_VISION_MODEL` |
| Image creation/editing | `NVIDIA_IMAGE_API_KEY` (falls back to `NVIDIA_API_KEY`); the web API supports `NVIDIA_IMAGE_ENDPOINT` and `NVIDIA_IMAGE_MODEL`, while Python workers use `NVIDIA_IMAGE_BASE_URL` (defaults to NVIDIA’s hosted GenAI route) |
| Video generation | `NVIDIA_VIDEO_API_KEY` (falls back to `NVIDIA_API_KEY`) |
| NVIDIA video upscaling | `VITE_NVIDIA_VSR_ENABLED=true` at build time, plus server-only `NVIDIA_VSR_BRIDGE_URL` and optional `NVIDIA_VSR_BRIDGE_TOKEN`; requires a deployed VSR gRPC bridge. Current Vercel upload cap: 4 MB. |
| Online web, image, and video-link search | `TAVILY_API_KEY` (server-side only) |
| Spoken responses | `ELEVEN_LABS_API_KEY` and/or `NVIDIA_MAGPIE_TTS_API_KEY` / `NVIDIA_CHATTERBOX_TTS_API_KEY`; optional `ELEVEN_LABS_VOICE_ID` |
| Sign-in and cross-device sync | Firebase Web App `VITE_FIREBASE_*` settings; enable the corresponding providers in Firebase Authentication |
| Optional error-report email delivery | `RESEND_API_KEY` and `ERROR_REPORT_FROM` |
| Other connectors | Configure the corresponding connector in server-side settings; do not expose provider credentials in frontend variables |

**Credential safety:** never commit secrets. Keep provider keys on the server and never give them a `VITE_` prefix. The Firebase `VITE_FIREBASE_*` entries are public web-client configuration, not service-account credentials; do not put a Firebase service-account key in the frontend. The checked-in Firestore rules scope user data to the authenticated UID.

## Deployment

The repository is configured for Vercel. Connect the repository to a Vercel project, set the required server-side environment variables for the features you intend to provide, and deploy. Pushing to the configured production branch can trigger deployment according to that Vercel project's settings; deployment and provider availability are separate from a successful GitHub push.

Check the non-secret health endpoint after deployment:

```bash
curl https://enosxai.vercel.app/api/healthz
```

A healthy response includes `ok` and an `aiConfigured` status flag; it never returns the API key. See [`docs/SETUP_GUIDE.md`](docs/SETUP_GUIDE.md) for additional setup and troubleshooting information.

## Security notes

- Provider credentials are intended to remain in server-side environment variables.
- Firebase sign-in and Firestore security rules restrict account data to the authenticated user.
- The public webpage reader rejects private/internal network destinations and validates redirects.
- Developer security-learning flows are intended for authorized lab contexts.
- Optional error reports contain technical diagnostics, not conversation text or uploaded file contents.

## Enosx Master Orchestrator service

This repository also contains a standalone Python orchestration layer for advanced Enosx deployments. It is intentionally separate from the existing React/Vercel application so current product behavior remains compatible while Enosx gains an asynchronous, multi-agent backend.

The top-level `EnosxNemotronBrain` exposes exactly eight high-level capabilities: five department routers, live web search, persistent vector memory, and a Python execution sandbox. The 34 specialist workers are kept behind those routers and are dispatched with `asyncio.gather(..., return_exceptions=True)`, bounded by `MAX_CONCURRENT_REQUESTS=10`. The brain's system prompt enforces memory-first retrieval, live-search and code-sandbox escalation, parallel decomposition, transparent synthesis, and memory write-back. A full mock-dispatch regression test verifies that all 34 configured workers can be instantiated and return successful results without provider credentials; live specialist availability still depends on deployment configuration and provider reachability.

### Python service setup

```bash
cp .env.example .env
python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
python test_parallel.py --mock
```

The mock test requires no API keys and verifies all 34 workers, parallel routing, memory recall, and sandbox execution. Add `NVIDIA_API_KEYS` as a comma-separated list, `TAVILY_API_KEY`, and optionally `OPENROUTER_API_KEY` to `.env` for live operation. The key rotator advances across NVIDIA keys, transient requests retry with exponential backoff, and each model follows the configured NVIDIA → OpenRouter → local endpoint chain. Never commit `.env` or live credentials.

### Adapters

Run the direct SDK from Python with `from orchestrator import EnosxNemotronBrain`. Run the REST/Webhook adapter with `uvicorn api_server:app --host 0.0.0.0 --port 8080`; it provides `/v1/chat/completions`, `/v1/memory/ingest`, `/v1/enosx/dispatch` (SSE), `/healthz`, and static `/output` files. Run the MCP adapter with `python mcp_server.py`; select `MCP_TRANSPORT=stdio` or `MCP_TRANSPORT=sse`. Lightweight local fallback templates are in `docker-compose.local.yml`.

The Python service files are `config.py`, `orchestrator.py`, `mcp_server.py`, `api_server.py`, `tools/`, and `workers/`. The existing ENOSX web application and its provider routes remain unchanged.

### Production deployment topology

For production, deploy the Python service as the container defined by `Dockerfile` on Railway, Render, or Fly.io. `render.yaml` is included as a template and mounts a persistent disk at `/app/data`, preserving Chroma memory across restarts. Set `NVIDIA_API_KEYS`, `OPENROUTER_API_KEY`, and `TAVILY_API_KEY` as platform secrets, never in the image. Set `RETURN_BASE64_MEDIA=true` when the client cannot access shared `/output` storage; generated media then includes both a static `/output/...` URL and an optional `data:image/png;base64,...` URI.

The Vercel `/api/chat` handler supports an optional server-side `ENOSX_ORCHESTRATOR_URL` and `ENOSX_ORCHESTRATOR_SECRET`. When configured, it forwards ENOSX One (`ex-core`), ENOSX Studio (`ex-pro`), and ENOSX Nexus (`enosh-mind`) requests to the Python `/v1/chat/completions` endpoint with the selected mode in the `X-Enosx-AI-Mode` header and metadata. Successful SSE responses pass through to the existing frontend. If the bridge is absent, unreachable, or returns 502, 503, or 504, the existing TypeScript NVIDIA handler runs unchanged. This provides a safe Vercel → Railway/Render deployment flow without making the frontend depend on the new service.

Remote Chroma is enabled with `CHROMA_SERVER_HOST` and `CHROMA_SERVER_PORT`; without them, memory defaults to local persistent `./data/enosx_memory` or the configured `MEMORY_PATH`.

## License

**Proprietary.** © 2024–2026 Enosx Technologies. All rights reserved. See repository terms before reuse or redistribution.

## Support and further reading

- [Setup guide](docs/SETUP_GUIDE.md)
- [Architecture and technical documentation](docs/)
- [Changelog](CHANGELOG.md)
- [GitHub Issues](https://github.com/enigmacxenosx/enosxai/issues)
- [Enosx Technologies on GitHub](https://github.com/enigmacxenosx)
