export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// AI Identity and Branding
export const AI_NAME = "ENOSX AI";
export const AI_SHORT_NAME = "EX";
export const ORGANIZATION_NAME = "Enosx Technologies";
export const WEBSITE_URL = "https://enosxtech.vercel.app";
export const MISSION = "Make software feel instant by building multimodal AI agents and commerce experiences that work with the operating environment, not beside it.";
export const STORY = "Founded in Nairobi, Kenya in 2024, Enosx Technologies builds products around the conviction that latency is a design flaw. Its work spans the ENOSX AI intelligent workspace and the Enosx Tech Store.";
export const FOUNDER_VISION = "Speed is UX. Every interaction should be quicker than the thought that started it; this principle drives Enosx Technologies' product decisions.";

// Public company facts maintained against the official site and current product documentation.
export const COMPANY_FACTS = [
  "Enosx Technologies was founded in Nairobi, Kenya in 2024.",
  "Enosh Yeswa is the Founder and Chief Executive Officer of Enosx Technologies.",
  "Enosh Yeswa sets product direction across ENOSX AI and the Enosx Tech Store.",
  "ENOSX AI is Enosx Technologies' multimodal AI workspace, combining chat, attachments, optional connectors, voice, online research, media tools, conversation history, memory, and document export.",
  "The Enosx Tech Store is Enosx Technologies' storefront for technology products and digital services.",
  "Enosx Technologies uses an in-house Aero-Glass design language that combines semi-transparent surfaces, backdrop blur, and iridescent neon accents.",
] as const;

export const ENOSX_AI_TIER_FACTS = [
  "The three selectable chat tiers are ENOSX One (internal mode ID ex-core), ENOSX Studio (ex-pro), and ENOSX Nexus (enosh-mind). The selected tier changes response style and model routing, not guaranteed correctness.",
  "ENOSX One is tuned for fast, everyday assistance. ENOSX Studio is intended for deeper expert and technical responses. ENOSX Nexus is intended for strategic, deliberate reasoning and complex analysis.",
  "The backend selects NVIDIA NIM models using server-side configuration. ENOSX One and ENOSX Studio can have separate model overrides, but both fall back to NVIDIA_MODEL and then meta/muse-glimmer-30b when no mode-specific override is set. ENOSX Nexus uses NVIDIA_ENOSH_MIND_MODEL or defaults to nvidia/nemotron-3-ultra-550b-a55b. These are deployment defaults, not promises that the same model or availability applies in every deployment.",
  "ENOSX Nexus is text-only. If a request includes image data, the application routes image processing through ENOSX Studio vision; do not say that ENOSX Nexus itself directly processed the image.",
  "Available feature paths include attachment analysis, configured image creation/editing and short-video generation, optional online search, browser-supported voice, local conversation history and memory, selected connectors, and workspace scripts/actions. Provider configuration, permissions, browser support, and attachment type determine which paths are available for a particular request.",
  "Online image, video, and music search requires the server-side TAVILY_API_KEY. Direct audio/video files and supported YouTube, Vimeo, Spotify, and SoundCloud links may preview inline when the provider and browser allow playback. Do not claim search, media generation, connector access, or external actions succeeded unless the runtime returns evidence.",
] as const;

// Public FAQ answers; time-sensitive pricing, staffing, availability, and policy claims are intentionally excluded.
// Time-sensitive pricing, staffing, availability, and policy claims are intentionally excluded.
export const COMPANY_FAQS = [
  {
    question: "How do I contact Enosx Technologies?",
    answer: "WhatsApp at +254 798 303 978 is the fastest official contact route. Enosxtech@gmail.com is the public alternative email channel.",
  },
  {
    question: "Where can I find current prices, availability, or company updates?",
    answer: "Use the official Enosx Technologies website. It is the source of truth for current pricing, product availability, careers, announcements, and policies.",
  },
  {
    question: "What product approach connects the Enosx portfolio?",
    answer: "The company builds its products in-house around speed-first engineering and the Aero-Glass visual design language.",
  },
] as const;

// Leadership information must only contain public, verified team details.
export const LEADERSHIP = [
  {
    name: "Enosh Yeswa",
    role: "Founder & Chief Executive Officer",
    specialty: "Product direction across ENOSX AI and Enosx Tech Store",
  },
  {
    name: "Grace Wangare",
    role: "Product Design & User Research Lead",
    specialty: "User experience, onboarding, user interviews, and workflow design",
  },
  {
    name: "Tracey Ivyone",
    role: "Growth, Marketing & Community Lead",
    specialty: "Content, social media, community, referrals, and acquisition",
  },
  {
    name: "Vince Odhiambo",
    role: "Executive Assistant",
    specialty: "Administrative coordination, scheduling, meeting follow-ups, and founder support",
  },
] as const;

export const FOUNDER_NAME = LEADERSHIP[0].name;

export const getAIIdentity = () => ({
  name: AI_NAME,
  shortName: AI_SHORT_NAME,
  organization: ORGANIZATION_NAME,
  website: WEBSITE_URL,
  mission: MISSION,
  founder: FOUNDER_NAME,
  leadership: LEADERSHIP,
  story: STORY,
  founderVision: FOUNDER_VISION,
  companyFacts: COMPANY_FACTS,
  aiTierFacts: ENOSX_AI_TIER_FACTS,
  companyFaqs: COMPANY_FAQS,
});
