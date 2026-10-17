# ENOSX AI

**Advanced AI Assistant & Application Platform** — Built with React, TypeScript, and Node.js

ENOSX AI is the flagship AI assistant and application platform from [Enosx Technologies](https://github.com/enigmacxenosx). This monorepo contains the React application, API services, shared libraries, and the standalone ExLover Coach relationship-coaching app.

[![Live Application](https://img.shields.io/badge/🚀_Live-enosxai.vercel.app-22c55e?style=for-the-badge)](https://enosxai.vercel.app) 
[![Desktop App Available](https://img.shields.io/badge/💻_Desktop-Available-0ea5e9?style=for-the-badge)](https://github.com/enigmacxenosx/enosxai/releases/latest)
[![Package Manager](https://img.shields.io/badge/📦_pnpm-f69220?style=for-the-badge)](https://pnpm.io)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

---

## 🌐 Live Applications

| Application | URL | Status |
|---|---|---|
| **ENOSX AI** | [enosxai.vercel.app](https://enosxai.vercel.app) | ✅ Live |
| **ExLover Coach** | [exlover.vercel.app](https://exlover.vercel.app) | ✅ Live |
| **Desktop App** | [Releases](https://github.com/enigmacxenosx/enosxai/releases/latest) | ✅ Available |

---

## 📋 Product Overview

ENOSX AI combines modern web technologies with powerful AI capabilities:

- **Frontend**: React + Vite with TypeScript (90.6% of codebase)
- **Backend**: Express API server + Vercel serverless functions
- **Desktop**: Tauri-based shell for native desktop integration
- **AI Models**: NVIDIA OpenAI-compatible API + Ollama offline support
- **Voice**: ElevenLabs integration for spoken responses
- **Styling**: CSS & modern design patterns (4.7% of codebase)

---

## 📁 Repository Structure

| Path | Purpose |
|---|---|
| `enosx-app/` | Vite + React frontend with TypeScript |
| `desktop-shell/` | Tauri desktop shell with native local-model bridge |
| `api-server/` | Main Express API server |
| `api/` | Vercel serverless functions |
| `lib/` | Shared schemas, clients, and utilities |
| `exlover/` | Standalone relationship-coaching application |
| `docs/` | Setup, design, and maintenance documentation |
| `scripts/` | Project utilities and automation |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or later)
- **pnpm** ([installation guide](https://pnpm.io/installation))

### Development Setup

```bash
# Clone the repository
git clone https://github.com/enigmacxenosx/enosxai.git
cd enosxai

# Install dependencies
pnpm install

# Start development servers
pnpm dev
```

For full setup and deployment instructions, see the [Setup Guide](docs/SETUP_GUIDE.md).

### Validate Production Build (ExLover Coach)

```bash
pnpm --filter @enosx/exlover typecheck
pnpm --filter @enosx/exlover build
```

---

## 💾 Desktop Application

### Download Installers

Get the latest Windows, macOS, or Linux installers from [GitHub Releases](https://github.com/enigmacxenosx/enosxai/releases/latest).

- **Windows**: `.msi` and `.exe` installers
- **macOS**: `.dmg` installer  
- **Linux**: AppImage and `.tar.gz`

Version tags (`v*`) automatically trigger the desktop installer build workflow.

### Features

- **Tray Integration**: Windows system tray icon for quick access
- **Auto-Updates**: Signed Tauri updater checks for new releases at startup
- **Offline Models**: Run chat locally via [Ollama](https://ollama.com/)
- **Active Window Context**: (Planned) OS-aware context awareness
- **File Integration**: (Planned) File and workspace context support

### Offline Model Setup

1. Install [Ollama](https://ollama.com/)
2. Pull a model: `ollama pull qwen3:4b` (or your preferred model)
3. Open **Settings → Offline Models** in the app
4. Select your model and start chatting locally

---

## ⚙️ Configuration & Deployment

### Environment Variables

**Firebase Auth & Firestore** (web account sign-in, profiles, and chat sync):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

These are Firebase Web App client settings, not service-account secrets. Configure them in the Vercel project environment and rebuild the frontend after setting them. Do not put a Firebase service-account key in any `VITE_` variable.

#### Firebase setup

1. Create/select a Firebase project and register a Web app in Firebase Console → **Project settings**.
2. Enable **Email/Password** and **Google** under **Authentication → Sign-in method**. Add the production site and any preview/test hosts to **Authorized domains**.
3. Create a Cloud Firestore database, then deploy this repository's rules: `firebase deploy --only firestore:rules` (requires Firebase CLI login and project selection).
4. Add the six `VITE_FIREBASE_*` Web App settings above to the Vercel project's environment variables and redeploy.

Authentication is handled by Firebase Auth; Firestore stores profiles under `users/{uid}` and chats/messages under that user's document tree. The checked-in `firestore.rules` limits reads and writes to the authenticated matching UID. Firebase Auth persists sign-in on the device/browser; the same Firebase account can be used on phone, tablet, or PC. Guest mode remains local to the device.

Existing pre-Firebase chats are not automatically copied into a signed-in account: they may belong to another person who used the same device. Export or review them before any future account migration.

**AI Services**:
- `NVIDIA_API_KEY` — NVIDIA's OpenAI-compatible API for chat
- EX Pro and ENOSH MIND use NVIDIA `moonshotai/kimi-k3` for text chat by default; set `NVIDIA_EX_PRO_MODEL`, `NVIDIA_ENOSH_MIND_MODEL`, or shared `NVIDIA_KIMI_MODEL` to override server-side.
- `NVIDIA_MODEL` and `NVIDIA_EX_CORE_MODEL` — Optional EX Core text model configuration
- `NVIDIA_IMAGE_API_KEY` — Optional image-provider key; falls back to `NVIDIA_API_KEY`
- `NVIDIA_IMAGE_ENDPOINT` — Required URL for a deployed Stable Diffusion 3.5 Large NIM endpoint
- `NVIDIA_IMAGE_MODEL` — Optional model identifier; defaults to Stable Diffusion 3.5 Large for model-specific `/v1/infer` endpoints

Image provider keys must remain server-side and must not use a `VITE_` prefix. The [NVIDIA Build listing](https://build.nvidia.com/stabilityai/stable-diffusion-3_5-large) currently marks Stable Diffusion 3.5 Large as downloadable; it does not provide a hosted endpoint for the model. Deploy the NIM and set `NVIDIA_IMAGE_ENDPOINT` to its reachable inference route. See [NVIDIA's NIM getting-started guide](https://docs.nvidia.com/nim/visual-genai/latest/getting-started.html). The model listing specifies non-commercial use; contact Stability AI for commercial-use terms.

**Online media search**:
- `SERPER_API_KEY` — (Optional) server-only Serper.dev key for searching online images and videos. Add it to the Vercel project's environment variables; do not use a `VITE_` prefix. Without it, regular chat continues to work and media search is simply unavailable.

**Voice**:
- `ELEVEN_LABS_API_KEY` — ElevenLabs API key (stored as encrypted secret)
- `ELEVEN_LABS_VOICE_ID` — (Optional) Custom voice ID

### Production Deployment

ENOSX AI is deployed to **Vercel**. All provider credentials are stored as encrypted deployment secrets and never committed.

**OAuth Callback URL** (Production):
```
https://enosxai.vercel.app/api/github/oauth/callback
```

Review the [Deployment & Security Guide](docs/DEPLOYMENT.md) for the complete checklist.

---

## 🔒 Security & Best Practices

- ✅ Server-side credential management (all API keys encrypted)
- ✅ Firebase Auth for email/password and Google sign-in
- ✅ Firestore rules scope profile and chat data to the authenticated Firebase UID
- ✅ Signed desktop releases via Tauri
- ✅ No credentials in version control
- ✅ Automatic desktop app updates with signature verification

See [Deployment & Security Guide](docs/DEPLOYMENT.md) for detailed security practices.

---

## 📚 Enosx Portfolio

- [E-commerce Hub](https://enosxtech-hub.vercel.app)
- [Official Website](https://enosxtech.vercel.app)
- [Enosh Blog](https://github.com/enigmacxenosx/enosh-blog)

---

## 📄 License

**Proprietary** — © 2024–2026 Enosx Technologies. All rights reserved.

---

## 🤝 Support & Documentation

- 📖 [Setup Guide](docs/SETUP_GUIDE.md)
- 🚀 [Deployment Guide](docs/DEPLOYMENT.md)
- 🏗️ [Architecture Documentation](docs/)
- 🐛 [GitHub Issues](https://github.com/enigmacxenosx/enosxai/issues)

---

**Made with ❤️ by [Enosx Technologies](https://enosxtech.vercel.app)**


## Automatic error reporting

Errors shown to users, uncaught browser exceptions, and React rendering failures are automatically submitted to `/api/error-report`. To deliver reports to `enosxtech@gmail.com` and `enosxservices@gmail.com`, set the **server-only** Vercel environment variables `RESEND_API_KEY` and `ERROR_REPORT_FROM`, using a sender verified with Resend, then redeploy. These credentials must not use a `VITE_` prefix. Reports include technical error details, app version, browser, and page path; they exclude conversation text, uploaded files, credentials, and the user's IP address. Delivery is best-effort and duplicate reports from the same client are suppressed for one minute.
