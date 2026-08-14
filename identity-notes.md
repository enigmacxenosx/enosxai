# ENOSX AI — Identity Research Notes

## Branding
- **Name:** ENOSX AI
- **Company:** Enosx Technologies
- **Founder:** Enosh
- **Founder Title:** Founder & Visionary
- **Contact:** proenosx@gmail.com
- **Slogan:** "Redefining the boundary between Human and OS"
- **Philosophy:** "Speed is UX"
- **Design Language:** "Aero-Glass" / Glassmorphic UI with iridescent neon accents
- **Copyright:** 2026 Enosx Technologies

## Visual Identity
- **Logo (Splash/Welcome):** "EX" text in bold black font inside a dark glassmorphic rounded-square box with cyan glow
- **Logo (Full):** Stylized "E" letterform with red (top), silver/metal (body), blue circuit traces, "ENOSX AI" text below
- **Primary Colors:** Cyan (#00F2FF), Purple (#7000FF), Crimson (#DC143C)
- **Gradient:** Cyan → Purple → Pink (used in headings)
- **Themes:** Dark (Crimson), Light, Neon (Cyan), Cyberpunk (Magenta), Minimal, Manus (Indigo)
- **Background:** Radial gradients with cyan/purple iridescence
- **Wallpapers:** Lavender Field, Neon City, Galaxy Tech, EX Circuits

## AI Identity
- **AI Name:** ENOSX AI (referred to as "Enosx" in greetings)
- **AI Model:** Llama 3.3 70B Versatile (via Groq API)
- **AI Modes (7):**
  - EX (default) — Purple #7c6ff7
  - EX Pro — Purple #a855f7
  - Smart — Blue #3b82f6
  - Fast — Green #10b981
  - Balanced — Amber #f59e0b
  - Task — Red #ef4444
  - Creative — Pink #ec4899

## Personality Modes (User-selectable)
- Professional (💼) — Focused, concise, business-ready
- Creative (🎨) — Imaginative, expressive, artistic
- Mentor (🧑‍🏫) — Patient, educational, detailed
- Casual (😊) — Friendly, relaxed, conversational

## Greetings
- "Hello there!"
- "Hii its Enosx"
- "How can I assist you today?"
- "Let's build something amazing."
- "Your AI workspace is ready."

## Core Features
1. **Chat Interface** — Streaming AI responses with markdown rendering
2. **Voice Input/Output** — STT (listening) and TTS (speaking) with Web Speech API
3. **File Analysis** — Drag-and-drop file upload (text/code files), auto-injected into context
4. **GitHub Integration** — GitHub context awareness, repo browsing, branch selection
5. **God Mode** — Advanced AI terminal (Ctrl+E+X+C or Alt+E+X), requires authorization
6. **Screen Guide** — AI-controlled screen guidance mode
7. **System Actions** — AI can open URLs, launch apps via structured action chains
8. **Memory Bank** — Persistent memory across conversations (localStorage)
9. **Clipboard Detection** — Auto-detects clipboard content for context
10. **Context-Aware Messages** — Detects active application and tailors suggestions
11. **Multi-Theme** — 6 themes with live switching
12. **Wallpaper System** — 4 presets + custom URL, adjustable blur
13. **Sound Effects** — Web Audio API synthesized sounds (click, send, receive, listen, error, godMode)
14. **Compact Mode** — Simplified UI for focused use
15. **Mobile Responsive** — Drawer sidebar, touch-optimized
16. **Splash Screen** — 3.5s animated intro with EX logo and progress bar

## Tech Stack
- **Frontend:** React 19 + TypeScript + Vite 7
- **UI:** Tailwind CSS v4, shadcn/ui, Framer Motion
- **AI Backend:** Groq API (Llama 3.3 70B), streaming SSE
- **Voice:** Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Icons:** Lucide React
- **Notifications:** Sonner toast
- **Routing:** Wouter
- **Deployment:** Vercel (static SPA)
