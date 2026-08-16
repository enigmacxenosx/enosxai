# ENOSX AI Project 

This repository contains the core components of the ENOSX AI ecosystem, including the API server, the main application, and various utility scripts and documentation.

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

## Development

This project uses `pnpm` workspaces. To get started:

1. Install dependencies: `pnpm install`
2. Start the development server: `pnpm dev`

For more details, see the [Setup Guide](docs/SETUP_GUIDE.md).

## ExLover Coach

`exlover/` is a standalone Vite + React relationship-coaching app in this repository. It includes a server-side Vercel function at `exlover/api/chat.ts`, so provider credentials are never sent to the browser. Configure `OPENROUTER_API_KEY` (preferred) or `OPENAI_API_KEY` in the Vercel project environment before production use; do not commit either secret.

To work on the app locally, run `pnpm --filter @enosx/exlover dev`. To validate the production bundle, run `pnpm --filter @enosx/exlover typecheck && pnpm --filter @enosx/exlover build`.
