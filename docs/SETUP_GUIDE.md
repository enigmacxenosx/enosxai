# ENOSX AI Setup Guide

This guide reflects the workspace manifests and current configuration files reviewed on 15 October 2026. It is a development guide, not proof that production deployment is configured or working.

## Requirements

- Node.js 20 or newer, subject to the versions supported by the current workspace dependencies.
- pnpm, preferably enabled through Corepack.
- Firebase project settings for signed-in web accounts. Server-side features may also require database and model-provider configuration.

## Install

From the repository root, install the workspace dependencies with **pnpm install**. Use the pnpm workspace; do not use npm or Yarn lockfiles.

## Configure local environment

Copy the variable names from **enosx-app/.env.example** into a local environment file for the frontend, and set only the values required for the feature being tested. The example includes Firebase web-app settings, optional API configuration, NVIDIA server credentials, and error-report configuration. Never commit filled-in environment files or put a provider secret in a VITE_ variable.

The Express API server reads its environment from the process/hosting environment. For local API-server routes, configure the needed server-only values such as PORT, DATABASE_URL, and NVIDIA_API_KEY in the shell or a local secret manager. Do not assume that a frontend .env.local file is loaded by the Express server.

## Run the web app and API server

Run the API server in one terminal from the repository root:

    PORT=8080 pnpm --filter @workspace/api-server dev

Run the Vite app in a second terminal:

    pnpm --filter @workspace/enosx-app dev

The Vite configuration defaults to port 5173 and proxies /api requests to localhost:8080. If you change either port, update the server environment and proxy configuration together. The API server requires PORT to be set.

## Build and type-check

From the repository root, **pnpm run build** runs the root type-check and recursive workspace builds. The workspace does not define a root pnpm dev script; use the two package-specific commands above.

## Data and safety notes for developers

The frontend has Firebase Auth/Firestore code and local guest storage. The repository also contains a separate Express API server with Neon-backed history/auth routes and Vercel serverless functions under api/. They are separate service paths; verify which path the current app and deployment use before changing data-retention or privacy documentation. Do not deploy an unauthenticated data route or treat a client-supplied user ID as proof of identity.

For desktop packaging, see **desktop-shell/README.md** and the platform-specific signing guide. For OAuth scopes and callback setup, see **docs/OAUTH_CONNECTOR_CONFIGURATION.md**.
