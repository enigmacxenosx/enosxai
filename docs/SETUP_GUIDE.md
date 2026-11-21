# ENOSX AI - Setup Guide

## Overview

ENOSX AI is a Vite/React frontend with Vercel serverless API functions. The chat API calls NVIDIA's OpenAI-compatible API from the server, so provider credentials must never be exposed in browser variables.

- **Frontend:** `enosx-app/`
- **API functions:** `api/`, including `/api/chat`
- **Shared libraries:** `lib/`
- **Desktop shell:** `desktop-shell/`

## Prerequisites

- Node.js 24 or later
- pnpm
- An NVIDIA API key for the NVIDIA OpenAI-compatible endpoint
- A GitHub token only if GitHub context features are enabled

## Environment Variables

### Required for chat

| Variable | Service | Purpose |
|---|---|---|
| `NVIDIA_API_KEY` | Vercel API functions/server | Server-side credential for NVIDIA chat completions |

`NVIDIA_API_KEY` must not use a `VITE_` prefix and must not be committed to Git. The frontend does not need this variable.

### Optional

| Variable | Purpose |
|---|---|
| `NVIDIA_MODEL` | Override the default EX Core text model |
| `NVIDIA_EX_CORE_MODEL` | Override the EX Core text model |
| `NVIDIA_EX_PRO_MODEL` | Override the EX Pro text model |
| `NVIDIA_ENOSH_MIND_MODEL` | Override the ENOSH MIND text model |
| `NVIDIA_VISION_MODEL` | Override the shared vision model |
| `NVIDIA_ENOSH_MIND_VISION_MODEL` | Override the ENOSH MIND/Nexus vision model |
| `NVIDIA_API_BASE_URL` | Override the NVIDIA-compatible API base URL |
| `GITHUB_TOKEN` | GitHub repository context features |
| `VITE_FIREBASE_*` | Firebase authentication and cloud history |
| `VITE_NVIDIA_VSR_ENABLED` | Set to `true` at build time to show the NVIDIA VSR video-upscale tool |
| `NVIDIA_VSR_BRIDGE_URL` | Server-only HTTPS URL of a bridge that translates multipart uploads to NVIDIA VSR gRPC and returns `{"url":"https://..."}` |
| `NVIDIA_VSR_BRIDGE_TOKEN` | Optional server-only bearer token for authenticating to that bridge |

### NVIDIA Video Super Resolution

VSR is a separately deployed NVIDIA NIM container, not the hosted NVIDIA video-generation endpoint. The app's `/api/video/upscale` route forwards a video as multipart field `video` to an HTTP bridge; that bridge must call the NIM's gRPC API and return a durable HTTPS result URL in JSON. Keep the bridge URL and token server-side. Enable the toolbar action by setting `VITE_NVIDIA_VSR_ENABLED=true` for the frontend build and configure `NVIDIA_VSR_BRIDGE_URL` in the server environment. The feature remains unavailable until the NIM and bridge are deployed.

NVIDIA documents the compressed-video NIM as requiring an Ada-generation-or-newer NVIDIA GPU, a supported NVDEC/NVENC codec path, Driver 590.33 or later, CUDA 13.1 or later, Docker, and NVIDIA Container Toolkit. The current Vercel proxy accepts videos up to 4 MB and waits up to 110 seconds; larger uploads require a direct-to-object-storage flow and longer-running job/status API instead. Do not enable this feature for production until the bridge, result storage, authentication, and upload policy are in place. See [NVIDIA's compressed video workflow](https://docs.nvidia.com/nim/maxine/vsr/latest/streaming/index.html) and [container requirements](https://catalog.ngc.nvidia.com/orgs/nim/nvidia/containers/vsr-nim/-).

## Local Development

```bash
git clone https://github.com/enigmacxenosx/enosxai.git
cd enosxai
pnpm install
export NVIDIA_API_KEY=your_nvidia_api_key_here
pnpm dev
```

Do not place a provider key in a `VITE_` variable. For a production-like deployment, configure the key in the server environment rather than a checked-in `.env` file.

The recommended model routing matches the live product tiers: `meta/muse-glimmer-30b` for ENOSX One (EX Core) and ENOSX Studio (EX Pro), and `nvidia/nemotron-3-ultra-550b-a55b` for ENOSX Nexus (ENOSH MIND). Use `meta/muse-glimmer-30b` for vision requests because it accepts both text and images.

## Vercel Deployment

The production site is deployed to Vercel. In the Vercel project connected to this repository:

1. Open **Settings → Environment Variables**.
2. Add `NVIDIA_API_KEY` for the **Production** environment.
3. Confirm the key has access to the configured NVIDIA models and sufficient credits.
4. Redeploy after adding or changing the variable.
5. Verify the deployment with:

```bash
curl https://enosxai.vercel.app/api/healthz
```

A healthy response includes `"ok":true` and an `"aiConfigured"` boolean. The key value is never returned.

## Troubleshooting

### AI is not responding

1. Check the health endpoint:

   ```bash
   curl https://enosxai.vercel.app/api/healthz
   ```

2. If `aiConfigured` is `false`, add `NVIDIA_API_KEY` to the Vercel **Production** environment and redeploy.
3. If `aiConfigured` is `true` but chat returns 503, inspect the Vercel function logs. NVIDIA may have rejected the request, the selected model may be unavailable, or the provider may be temporarily unavailable.
4. Check the browser Network tab for the `/api/chat` response and its status code.
5. Confirm the frontend is calling `/api/chat` on the same deployment and that no stale deployment is serving the page.

### `NVIDIA_API_KEY is not configured on the server`

This means the serverless function cannot see the production environment variable. Add the variable in Vercel, select **Production**, save it, and redeploy. A local `.env` file does not configure the Vercel deployment.

### `The AI service is temporarily unavailable`

This indicates a provider failure, timeout, rate limit, invalid model, or another server-side request error. Check Vercel logs and NVIDIA provider availability. The API retries transient provider statuses once before returning 503.

## API Endpoints

### Chat

`POST /api/chat` accepts a `messages` array and returns a Server-Sent Events stream from the configured NVIDIA model.

```json
{
  "messages": [
    { "role": "user", "content": "Hello" }
  ],
  "aiMode": "ex-core"
}
```

### Health

`GET /api/healthz` returns a non-secret deployment diagnostic:

```json
{
  "ok": true,
  "aiConfigured": true
}
```

### GitHub context

`GET /api/github/context` returns repository context when GitHub integration is configured.

## Direct API Test

```bash
curl -sS https://enosxai.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  --data '{"messages":[{"role":"user","content":"Reply with exactly: OK"}],"aiMode":"ex-core"}'
```

A successful response uses `text/event-stream`. A 503 response means the deployment or NVIDIA provider still needs attention.
