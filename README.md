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

#### Instagram and WhatsApp provider variables

The sign-in UI includes Instagram and a WhatsApp-style phone option. Keep the following values server-side and never add a `VITE_` prefix or commit real credentials:

- Instagram OAuth: `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET`, and `INSTAGRAM_OAUTH_REDIRECT_URI`
- WhatsApp Business OTP: `META_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, and `WHATSAPP_VERIFY_TOKEN`

WhatsApp does not provide a standard consumer “Sign in with WhatsApp” OAuth provider. Its credentials support a separate server-side WhatsApp Business OTP flow. Instagram OAuth also needs a server callback and a redirect URI registered in Meta Developer settings before the button can authenticate users. The current Google and phone/SMS flows remain handled by Firebase Auth.

Existing pre-Firebase chats are not automatically copied into a signed-in account: they may belong to another person who used the same device. Export or review them before any future account migration.

**AI Services**:
- `NVIDIA_API_KEY` — NVIDIA's OpenAI-compatible API for chat
- `NVIDIA_MODEL` and `NVIDIA_EX_CORE_MODEL` — Optional default and EX Core text model configuration; the recommended value is `meta/muse-glimmer-30b`
- `NVIDIA_EX_PRO_MODEL` — EX Pro text model configuration; the recommended value is `meta/muse-glimmer-30b`
- `NVIDIA_ENOSH_MIND_MODEL` — ENOSH MIND text model configuration; the recommended value is `nvidia/nemotron-3-ultra-550b-a55b`
- `NVIDIA_VISION_MODEL` — Shared fallback vision model configuration
- `NVIDIA_EX_CORE_VISION_MODEL` and `NVIDIA_EX_PRO_VISION_MODEL` — Explicit Muse Glimmer vision routing for EX Core and EX Pro
- Image-bearing requests made while ENOSH MIND is selected automatically use EX Pro vision because Nemotron 3 Ultra is text-only
- `NVIDIA_IMAGE_API_KEY` — Optional image-provider key; falls back to `NVIDIA_API_KEY`
- `NVIDIA_IMAGE_ENDPOINT` — Optional image endpoint override; defaults to NVIDIA's hosted FLUX.2 Klein 4B endpoint
- `NVIDIA_IMAGE_MODEL` — Optional model identifier; defaults to `black-forest-labs/flux.2-klein-4b`
- `NVIDIA_VIDEO_API_KEY` — Optional video-provider key; falls back to `NVIDIA_API_KEY`

Image and video provider keys must remain server-side and must not use a `VITE_` prefix. The image flow uses NVIDIA's hosted [FLUX.2 Klein 4B](https://build.nvidia.com/black-forest-labs/flux_2-klein-4b) endpoint for text-to-image and image editing. The video flow uses NVIDIA's hosted [Cosmos3 Nano](https://build.nvidia.com/nvidia/cosmos3-nano) endpoint for text-to-video and image-to-video. Clips are configured as a short 25-frame, 480p 16:9 preview at 24 fps. Cosmos3 Nano applies its required screening and SynthID watermarking. For Vercel, add `NVIDIA_API_KEY` (or the separate image/video key variables) as encrypted server environment variables and redeploy; never set a `VITE_` copy. The image endpoint/model variables are only needed to override the hosted defaults. Generation requires an NVIDIA API key with access to the selected hosted endpoints; request limits and availability are controlled by NVIDIA.

**Online media search**:
- `SERPER_API_KEY` — (Optional) server-only Serper.dev key for searching online images and videos. Add it to the Vercel project's environment variables; do not use a `VITE_` prefix. Without it, regular chat continues to work and media search is simply unavailable.

Chat can search for online learning videos and pictures from natural-language requests, including requests for both types together. Pictures appear inline with a source link; videos embed when the source supports it and otherwise remain clickable. Media search requires `SERPER_API_KEY`.

**Website study**: Ask Enosx AI to read or summarize a public webpage and include its HTTP(S) URL. The reader fetches static HTML/text only, rejects private/internal network targets, validates redirects, and bounds the amount of content returned. JavaScript-only or protected pages may need the relevant text pasted into chat.

**Voice**:
- `ELEVEN_LABS_API_KEY` — ElevenLabs API key (stored as encrypted secret)
- `ELEVEN_LABS_VOICE_ID` — (Optional) Custom voice ID
- `NVIDIA_MAGPIE_TTS_API_KEY` — NVIDIA credential for the Magpie multilingual text-to-speech model (server-side only)
- `NVIDIA_CHATTERBOX_TTS_API_KEY` — NVIDIA credential for the Chatterbox multilingual male voice (server-side only)

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
