# ENOSX AI — Developer Guide

Maintained by **Enosx Tech**. This guide covers local setup and verification for the ENOSX AI repository. For current product capabilities, deployment details, and provider configuration, see the [project README](../README.md) and [setup guide](SETUP_GUIDE.md).

## Requirements

- Node.js 24 or later
- pnpm 9

## Local setup

```bash
git clone https://github.com/enigmacxenosx/enosxai.git
cd enosxai
pnpm install
pnpm --filter @workspace/enosx-app dev
```

The command above starts the web frontend. Follow the setup guide for local API services and server-backed features.

## Validation

```bash
pnpm run typecheck
pnpm --filter @workspace/enosx-app test:unit
pnpm --filter @workspace/enosx-app build
```

## Configuration and credentials

Use [`enosx-app/.env.example`](../enosx-app/.env.example) as the reference for supported environment variable names. Configure provider credentials only in the appropriate server or deployment environment; never commit real credentials or expose secret API keys through frontend `VITE_` variables.

## Production deployment

The production deployment is configured through the project's Vercel settings. GitHub changes and deployments are separate: a successful push does not by itself guarantee that a deployment completed. After deployment, use the health-check instructions in the project README.
