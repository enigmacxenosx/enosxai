export const COOKIE_NAME = "enosx_session";
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// AI Identity and Branding
export const AI_NAME = "ENOSX AI";
export const AI_SHORT_NAME = "EX";
export const ORGANIZATION_NAME = "Enosx Technologies";
export const WEBSITE_URL = "https://enosxtechnologies450.vercel.app";
export const FOUNDER_NAME = "Enosh";
export const MISSION = "Transform businesses with cutting-edge AI and tech solutions";
export const STORY = "Enosx Technologies was born out of a simple necessity: the need for an AI that doesn't just 'chat,' but operates. Founded by Enosh, the vision was a system that breathes with the OS—a fluid, iridescent interface powered by high-performance architecture and proprietary design language.";
export const FOUNDER_VISION = "Enosh leads the design and architectural direction of the ENOSX ecosystem. His philosophy is simple: Speed is UX. By leveraging high-performance inference engines and a glassmorphic design language, Enosh has turned the standard desktop into an intelligent workspace.";

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
  story: STORY,
  founderVision: FOUNDER_VISION,
});
