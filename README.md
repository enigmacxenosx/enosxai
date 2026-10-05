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

**GitHub OAuth** (Required for sign-in):
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `GITHUB_OAUTH_STATE_SECRET`
- `GITHUB_OAUTH_REDIRECT_ORIGIN`

**AI Services**:
- `NVIDIA_API_KEY` — NVIDIA's OpenAI-compatible API for chat
- `NVIDIA_MODE` — Model selection (e.g., `meta/llama-3.1-70b`)

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
- ✅ GitHub OAuth for secure sign-in
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
