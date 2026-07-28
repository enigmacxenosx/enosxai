# ENOSX AI Assistant - Setup Guide

## Overview

The ENOSX AI Assistant is a multi-service application consisting of:

1. **Frontend Service** (`artifacts/enosx-assistant`): React + Vite web application
2. **API Service** (`artifacts/api-server`): Express.js backend for AI chat

Both services must be running simultaneously for the application to function properly.

## Prerequisites

- Node.js 24+
- pnpm package manager
- Groq API key (from https://console.groq.com)
- GitHub token (optional, for repository context features)

## Environment Variables

### Required

| Variable | Service | Value | Example |
|----------|---------|-------|---------|
| `GROQ_API_KEY` | API Server | Your Groq API key | `gsk_...` |
| `PORT` | Frontend | Frontend port | `18426` (Replit) or `3000` (local) |
| `BASE_PATH` | Frontend | URL base path | `/` |
| `API_PORT` | Frontend | API server port | `8080` |
| `PORT` | API Server | API server port | `8080` |

### Optional

| Variable | Service | Value | Example |
|----------|---------|-------|---------|
| `GITHUB_TOKEN` | API Server | GitHub API token | `ghp_...` |
| `GH_TOKEN` | API Server | GitHub CLI token (fallback) | `ghu_...` |

## Local Development Setup

### Step 1: Install Dependencies

```bash
cd enosxassistant
pnpm install
```

### Step 2: Set Environment Variables

Create a `.env.local` file in the project root:

```bash
# Frontend
export PORT=3000
export BASE_PATH=/
export API_PORT=8080

# API Server
export GROQ_API_KEY=your_groq_api_key_here
export GITHUB_TOKEN=your_github_token_here  # optional
```

### Step 3: Start the API Server

Open a terminal and run:

```bash
export PORT=8080
export GROQ_API_KEY=your_groq_api_key_here
cd artifacts/api-server
pnpm run dev
```

You should see:
```
Server listening { port: 8080 }
```

### Step 4: Start the Frontend Service

Open another terminal and run:

```bash
export PORT=3000
export API_PORT=8080
export BASE_PATH=/
cd artifacts/enosx-assistant
pnpm run dev
```

The frontend will be available at `http://localhost:3000`

## Replit Deployment

### Automatic Setup

When deploying to Replit, the `.replit-artifact` configurations handle most setup automatically:

1. **Frontend Artifact** (`artifacts/enosx-assistant/.replit-artifact/artifact.toml`):
   - Runs on port 18426
   - Proxies `/api/*` requests to `http://localhost:8080`
   - Sets `PORT=18426`, `BASE_PATH=/`, `API_PORT=8080`

2. **API Artifact** (`artifacts/api-server/.replit-artifact/artifact.toml`):
   - Runs on port 8080
   - Handles `/api/*` routes
   - Sets `PORT=8080`

### Required Secrets

Add these to your Replit Secrets:

1. `GROQ_API_KEY`: Your Groq API key
2. `GITHUB_TOKEN`: (Optional) Your GitHub API token

## Troubleshooting

### "AI is not responding"

**Possible Causes:**

1. **API Server not running**
   - Check that the API server is running on port 8080
   - Verify with: `curl http://localhost:8080/api/healthz`

2. **GROQ_API_KEY not set**
   - Verify the environment variable is set: `echo $GROQ_API_KEY`
   - Check Replit Secrets tab if deploying to Replit

3. **API_PORT mismatch**
   - Ensure frontend's `API_PORT` matches the API server's `PORT`
   - Frontend should proxy to: `http://localhost:${API_PORT}`

4. **Network connectivity**
   - Ensure the frontend can reach the API server
   - Check browser console for network errors
   - Verify CORS is enabled (it is by default)

### "GROQ_API_KEY environment variable is not set"

- This error appears when the API server receives a chat request but `GROQ_API_KEY` is not configured
- Set the environment variable and restart the API server

### "No response body from Groq"

- The Groq API returned an error
- Check your API key is valid
- Verify you have API credits available
- Check Groq API status at https://status.groq.com

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (User)                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/WebSocket
                         │
┌────────────────────────▼────────────────────────────────────┐
│              Frontend Service (Vite + React)                │
│              Port: 18426 (Replit) / 3000 (Local)           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Vite Proxy: /api/* → http://localhost:8080         │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP (Proxied)
                         │
┌────────────────────────▼────────────────────────────────────┐
│              API Service (Express.js)                       │
│              Port: 8080                                     │
│                                                             │
│  Routes:                                                    │
│  - POST /api/chat          → Groq API                      │
│  - GET /api/github/context → GitHub API                    │
│  - GET /api/healthz        → Health check                  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
    Groq API        GitHub API       (Other APIs)
```

## API Endpoints

### Chat Endpoint

**POST** `/api/chat`

Request:
```json
{
  "messages": [
    { "role": "user", "content": "Hello, how are you?" }
  ],
  "githubContext": "optional repository context"
}
```

Response: Server-Sent Events (SSE) stream with Groq API response

### GitHub Context Endpoint

**GET** `/api/github/context`

Response:
```json
{
  "repos": [...],
  "context": "formatted repository information"
}
```

### Health Check Endpoint

**GET** `/api/healthz`

Response:
```json
{
  "status": "ok"
}
```

## Development Tips

### Hot Reload

Both services support hot reload during development:

- **Frontend**: Vite automatically reloads on file changes
- **API Server**: Run with `pnpm run dev` which rebuilds and restarts on changes

### Debugging

**Frontend Debugging:**
- Open browser DevTools (F12)
- Check Network tab for API requests
- Check Console for JavaScript errors

**API Server Debugging:**
- Check terminal output for server logs
- Look for error messages in the API response

### Testing the API Directly

```bash
# Test health endpoint
curl http://localhost:8080/api/healthz

# Test chat endpoint
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      { "role": "user", "content": "Hello" }
    ]
  }'
```

## Performance Optimization

### Frontend

- Uses code splitting with lazy loading
- Optimized images (WebP format)
- CSS-in-JS with Tailwind for minimal bundle size

### API Server

- Streams responses from Groq for real-time updates
- Caches repository context to reduce GitHub API calls
- Efficient message serialization

## Security Considerations

1. **API Key Protection**
   - Never commit `GROQ_API_KEY` to version control
   - Use environment variables or Replit Secrets
   - Rotate keys periodically

2. **CORS**
   - API server has CORS enabled for all origins (can be restricted)
   - Frontend proxies requests through Vite in development

3. **Rate Limiting**
   - Groq API has rate limits (check your plan)
   - Implement client-side debouncing for rapid requests

## Deployment

### Replit

The application is configured for Replit deployment:

1. Push code to GitHub
2. Import repository to Replit
3. Add `GROQ_API_KEY` to Secrets
4. Click "Run" to start both services

### Docker

To containerize the application:

```dockerfile
FROM node:24-alpine

WORKDIR /app

COPY . .

RUN pnpm install

ENV PORT=8080
ENV GROQ_API_KEY=your_key_here

CMD ["pnpm", "run", "dev"]
```

### Other Platforms

The application can be deployed to any platform that supports Node.js. Ensure:

1. Both services are started
2. Environment variables are set
3. Ports 18426 (frontend) and 8080 (API) are accessible
4. Network connectivity between services is available

## Support

For issues or questions:

1. Check this guide's Troubleshooting section
2. Review error messages in browser console and server logs
3. Check Groq API status and documentation
4. Open an issue on GitHub

## Version History

- **v1.0.0** (Current): Multi-service architecture with separate frontend and API
- **v0.x.x** (Legacy): Single-process architecture (deprecated)
