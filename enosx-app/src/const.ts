export const COOKIE_NAME = "enosx_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// AI Identity and Branding
export const AI_NAME = "ENOSX AI";
export const AI_SHORT_NAME = "EX";
export const ORGANIZATION_NAME = "Enosx Technologies";
export const WEBSITE_URL = "https://enosxtechnologies450.vercel.app";
export const MISSION = "Empower businesses of all sizes with enterprise-grade AI technology and robust e-commerce solutions that drive growth, efficiency, and customer satisfaction.";
export const STORY = "Enosx Technologies was born out of a simple necessity: the need for an AI that doesn't just 'chat,' but operates. The vision was a system that breathes with the OS—a fluid, iridescent interface powered by high-performance architecture and proprietary design language.";
export const FOUNDER_VISION = "The philosophy is simple: Speed is UX. By leveraging high-performance inference engines and a glassmorphic design language, ENOSX has turned the standard desktop into an intelligent workspace.";

// Leadership Team
export const LEADERSHIP = [
  { name: "Ahmed Al-Mazrouei", role: "Founder & CEO", specialty: "AI Strategy & Business Innovation" },
  { name: "Dr. Layla Hassan", role: "Chief Technology Officer", specialty: "AI/ML & Cloud Architecture" },
  { name: "Karim Al-Mansoori", role: "Head of Product", specialty: "Product Design & UX" },
  { name: "Aisha Al-Khaleej", role: "Operations Director", specialty: "Business Development & Client Success" }
];

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
  url.searchParams.set("type", "signIn");

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
});
