# ENOSX AI Deployment Guide

**Deployment guide status:** Configuration notes based on checked-in files as of 15 October 2026. No production deployment was inspected or tested during this documentation change. Re-check every setting in the hosting account before release.

## What the repository configures

The root **vercel.json** selects Vite, runs **pnpm run build**, and publishes **enosx-app/dist/public**. It also configures serverless functions from **api/** and rewrites selected API paths. This file does not configure a standalone deployment for **api-server/**. If production still uses the Express API server, deploy that service separately, set its public base URL in the frontend as required, and test the exact routes before launch.

## Vercel checklist

1. Import the repository and use the repository root as the project root unless the current Vercel project intentionally uses a different root.
2. Confirm the build command and output directory against root vercel.json before changing dashboard overrides.
3. Add the required Firebase web-app values as frontend build variables. Add NVIDIA, Resend, database, and OAuth credentials only to server-side environment settings for the functions/service that needs them. Use **enosx-app/.env.example** as the current variable-name reference and verify names against the exact function code. Never expose secret keys through a VITE_ prefix.
4. Configure OAuth provider redirect URIs to the deployed callback route and use the exact production domain. Follow **docs/OAUTH_CONNECTOR_CONFIGURATION.md** for provider-specific details.
5. Deploy a preview first. Test sign-in, chat, any enabled connectors, error reporting, and the configured data-storage/deletion paths using test accounts only.
6. Verify production logs, access controls, rate limits, secret scope, database region/retention, and rollback procedure. A successful build is not proof that runtime services or data protection controls work.

## Release gates

- Resolve the authentication/access-control review findings for history and account routes; verify them with tests against the deployed service.
- Confirm whether Firebase, Neon, Vercel functions, and the Express API server are all active in production, then make the privacy notice match those actual flows.
- Complete the child-access review before enabling the requested minimum age of 6. No verified guardian-consent workflow was established in this review.
- Complete the third-party dependency, asset, and AI-model license inventory before distributing installers or introducing paid access.

## Desktop releases

The Tauri desktop shell has a separate packaging and signing flow. Use the current release workflow and **docs/WINDOWS_INSTALLER_SIGNING.md**; verify code signing, updater signatures, platform permissions, model licensing, and installer contents before publishing binaries.
