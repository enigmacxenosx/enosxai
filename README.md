# ENOSX AI Project

![Enosx Technologies](https://img.shields.io/badge/Enosx-Technologies-0ea5e9) ![pnpm](https://img.shields.io/badge/package%20manager-pnpm-f69220) ![Live](https://img.shields.io/badge/live-enosxai.vercel.app-22c55e)

This repository contains the core components of the ENOSX AI ecosystem, including the API server, the main application, and various utility scripts and documentation.

> **ENOSX AI** is the flagship AI assistant of Enosx Technologies — founded in 2024 by [Enosh Yeswa](https://github.com/enigmacxenosx). WhatsApp [+254 798 303 978](https://wa.me/254798303978) · Instagram [@enosx_tech](https://instagram.com/enosx_tech) · [@engima_cx](https://instagram.com/engima_cx)

## Live Site

| Item | Details |
| :--- | :--- |
| Production | [enosxai.vercel.app](https://enosxai.vercel.app) |
| Stack | Express API server, Vite + React frontend, pnpm workspaces |
| Hosting | Vercel |

## Repository Structure

The repository has been organized to separate core application code from documentation and session artifacts:

| Directory | Description |
| :--- | :--- |
| `api/` | Serverless API functions for Vercel deployment. |
| `api-server/` | The main Express-based API server for ENOSX AI. |
| `enosx-app/` | The frontend application for the ENOSX AI assistant. |
| `lib/` | Shared libraries, including database schemas and API clients. |
| `mockup-sandbox/` | A development environment for UI mockups and testing. |
| `docs/` | Project documentation, including fix summaries and design documents. |
| `chats/` | Artifacts and scripts generated during AI chat sessions. |
| `scripts/` | Project-wide utility scripts and automation. |

## Key Documentation

- [Setup Guide](docs/SETUP_GUIDE.md)
- [Design Document](docs/design_document.md)
- [Bug Fixes Log](docs/FIXES.md)
- [Identity Fix Summary](docs/IDENTITY_FIX_SUMMARY.md)

Additional apps in this monorepo:

| App | Path | Notes |
| :--- | :--- | :--- |
| ENOSX AI assistant | `enosx-app/` | Vite + React frontend |
| API server | `api-server/` | Express-based main server |
| Serverless functions | `api/` | Vercel deployments |
| ExLover Coach | `exlover/` | Relationship-coaching app, live at [exlover.vercel.app](https://exlover.vercel.app) |

## Enosx Portfolio

| Product | URL |
| :--- | :--- |
| ENOSX AI | https://enosxai.vercel.app |
| E-commerce Hub | https://enosxtech-hub.vercel.app |
| Tech Site | https://enosxtech.vercel.app |
| Exlover Coaching | https://exlover.vercel.app |

## Development

This project uses `pnpm` workspaces. To get started:

1. Install dependencies: `pnpm install`
2. Start the development server: `pnpm dev`

For more details, see the [Setup Guide](docs/SETUP_GUIDE.md).

## ExLover Coach

`exlover/` is a standalone Vite + React relationship-coaching app in this repository. It includes a server-side Vercel function at `exlover/api/chat.ts`, so provider credentials are never sent to the browser. Configure `OPENROUTER_API_KEY` (preferred) or `OPENAI_API_KEY` in the Vercel project environment before production use; do not commit either secret.

To work on the app locally, run `pnpm --filter @enosx/exlover dev`. To validate the production bundle, run `pnpm --filter @enosx/exlover typecheck && pnpm --filter @enosx/exlover build`.
