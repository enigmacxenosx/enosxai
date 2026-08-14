export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// AI Identity and Branding
export const AI_NAME = "ENOSX AI";
export const AI_SHORT_NAME = "EX";
export const ORGANIZATION_NAME = "Enosx Technologies";
export const WEBSITE_URL = "https://enosxtechnologies.vercel.app";
export const MISSION = "Make software feel instant by building multimodal AI assistants, commerce experiences, and coaching products that work with the operating environment, not beside it.";
export const STORY = "Founded in Nairobi, Kenya in 2024, Enosx Technologies builds products around the conviction that latency is a design flaw. Its work spans the ENOSX AI intelligent workspace, the Enosx Tech Store, and ExLover Coach.";
export const FOUNDER_VISION = "Speed is UX. Every interaction should be quicker than the thought that started it; this principle drives Enosx Technologies' product decisions.";

// Public company facts, verified against enosxtechnologies.vercel.app on 2026-08-14.
export const COMPANY_FACTS = [
  "Enosx Technologies was founded in Nairobi, Kenya in 2024.",
  "Enosh Yeswa is the Founder and Chief Executive Officer of Enosx Technologies.",
  "Enosh Yeswa sets product direction across ENOSX AI, the Enosx Tech Store, and ExLover Coach.",
  "ENOSX AI is an intelligent workspace with context-aware messaging, GitHub and code-review support, voice features, memory, web intelligence, image generation, and document export.",
  "The Enosx Tech Store is Enosx Technologies' storefront for technology products and digital services.",
  "ExLover Coach is an AI-guided relationship-coaching product focused on thoughtful prompts, reflection, and practical advice.",
  "Enosx Technologies uses an in-house Aero-Glass design language that combines semi-transparent surfaces, backdrop blur, and iridescent neon accents.",
] as const;

// Public FAQ answers, verified against enosxtechnologies.vercel.app on 2026-08-14.
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
    specialty: "Product direction across ENOSX AI, Enosx Tech Store, and ExLover Coach",
  },
] as const;

export const FOUNDER_NAME = LEADERSHIP[0].name;

export const getLoginUrl = () => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);

  return url.toString();
};

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
  companyFaqs: COMPANY_FAQS,
});
