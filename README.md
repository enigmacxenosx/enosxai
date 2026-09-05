# ENOSX AI

ENOSX AI is the flagship AI assistant and application platform from [Enosx Technologies](https://github.com/enigmacxenosx). This monorepo contains the React application, API services, shared libraries, and supporting documentation.

[![Live site](https://img.shields.io/badge/live-enosxai.vercel.app-22c55e)](https://enosxai.vercel.app) [![Package manager](https://img.shields.io/badge/package%20manager-pnpm-f69220)](https://pnpm.io/)

## Product

The platform combines a Vite and React frontend with Express and Vercel API services. It also includes the standalone ExLover Coach application under `exlover/`.

## Live applications

| Application | URL |
|---|---|
| ENOSX AI | [enosxai.vercel.app](https://enosxai.vercel.app) |
| ExLover Coach | [exlover.vercel.app](https://exlover.vercel.app) |

## Repository structure

| Path | Purpose |
|---|---|
| `enosx-app/` | Vite and React frontend |
| `api-server/` | Main Express API server |
| `api/` | Vercel serverless functions |
| `lib/` | Shared schemas, clients, and utilities |
| `exlover/` | Relationship-coaching application |
| `docs/` | Setup, design, and maintenance documentation |
| `scripts/` | Project utilities and automation |

## Getting started

Requirements: Node.js and [pnpm](https://pnpm.io/installation).

```bash
git clone https://github.com/enigmacxenosx/enosxai.git
cd enosxai
pnpm install
pnpm dev
```

See the [setup guide](docs/SETUP_GUIDE.md) for the full development and deployment workflow. For a production validation of ExLover Coach, run `pnpm --filter @enosx/exlover typecheck && pnpm --filter @enosx/exlover build`.

## Configuration

GitHub sign-in uses an OAuth App. Configure these values in the deployment environment; never commit credentials:

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_OAUTH_STATE_SECRET`
- `GITHUB_OAUTH_REDIRECT_ORIGIN`

The callback URL for production is `https://enosxai.vercel.app/api/github/oauth/callback`. ENOSX AI chat uses the server-side `NVIDIA_API_KEY` with NVIDIA's OpenAI-compatible API. Set `NVIDIA_MODEL` (default: `openai/gpt-oss-20b`) and `NVIDIA_VISION_MODEL` as needed; per-mode overrides are also supported with `NVIDIA_EX_*_MODEL` and `NVIDIA_EX_*_VISION_MODEL`. Image generation uses NVIDIA Visual Generative AI NIM through `NVIDIA_IMAGE_MODEL` (default: `qwen-image`).

ENOSX AI spoken responses use the server-side ElevenLabs voice service. Configure `ELEVEN_LABS_API_KEY` as an encrypted deployment secret; optionally set `ELEVEN_LABS_VOICE_ID` to choose another ElevenLabs voice. The client does not use browser `speechSynthesis`, so Windows system voices are never selected as a fallback.

## Deployment and security

The production deployment targets Vercel. Provider credentials remain server-side and must be stored as encrypted deployment secrets. Review the project documentation and run the available checks before release.

## Enosx portfolio

- [E-commerce Hub](https://enosxtech-hub.vercel.app)
- [Official website](https://enosxtech.vercel.app)
- [Enosh Blog](https://github.com/enigmacxenosx/enosh-blog)

## License

Proprietary — © 2024–2026 Enosx Technologies. All rights reserved.
