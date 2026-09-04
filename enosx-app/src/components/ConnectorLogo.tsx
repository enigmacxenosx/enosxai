import type { SimpleIcon } from "simple-icons";
import {
  siAirtable,
  siAlltrails,
  siAnthropic,
  siApollographql,
  siAsana,
  siAtlassian,
  siBitly,
  siBox,
  siBrex,
  siBuffer,
  siCaldotcom,
  siCalendly,
  siCanvas,
  siClickup,
  siCloudflare,
  siCloudinary,
  siCoda,
  siCoinmarketcap,
  siDatabricks,
  siDify,
  siDropbox,
  siElevenlabs,
  siEtsy,
  siExcalidraw,
  siGooglechrome,
  siGithub,
  siShopify,
  siVercel,
  siGmail,
} from "simple-icons/icons";

interface ConnectorLogoProps {
  name: string;
  accent: string;
}

const LOGO_SLUG_OVERRIDES: Record<string, string> = {
  "AWS Knowledge": "amazonaws",
  "Alpha Vantage": "alphavantage",
  "Anchor Browser": "googlechrome",
  "Cloudflare API": "cloudflare",
  "Cloudflare Worker Bindings": "cloudflareworkers",
  "Cloudinary Asset": "cloudinary",
  "Clover API": "clover",
  CoinDesk: "coindesk",
  CoinGecko: "coingecko",
  CoinMarketCap: "coinmarketcap",
  "Crypto.com": "crypto",
  "Customer.io": "customerio",
  DataForSEO: "dataforseo",
  "ElevenLabs API": "elevenlabs",
  Excalidraw: "excalidraw",
};

const LOCAL_LOGOS: Record<string, SimpleIcon> = {
  airtable: siAirtable,
  alltrails: siAlltrails,
  anthropic: siAnthropic,
  apollo: siApollographql,
  apollographql: siApollographql,
  asana: siAsana,
  atlassian: siAtlassian,
  bitly: siBitly,
  box: siBox,
  brex: siBrex,
  buffer: siBuffer,
  caldotcom: siCaldotcom,
  calendly: siCalendly,
  canva: siCanvas,
  clickup: siClickup,
  cloudflare: siCloudflare,
  cloudflareworkers: siCloudflare,
  cloudinary: siCloudinary,
  coda: siCoda,
  coinmarketcap: siCoinmarketcap,
  databricks: siDatabricks,
  dify: siDify,
  dropbox: siDropbox,
  elevenlabs: siElevenlabs,
  etsy: siEtsy,
  excalidraw: siExcalidraw,
  googlechrome: siGooglechrome,
  github: siGithub,
  shopify: siShopify,
  vercel: siVercel,
  email: siGmail,
};

function toLogoSlug(name: string) {
  if (LOGO_SLUG_OVERRIDES[name]) return LOGO_SLUG_OVERRIDES[name];

  return name
    .replace(/\s+(API|Knowledge|Asset)$/i, "")
    .replace(/\s+Worker Bindings$/i, "")
    .toLowerCase()
    .replace(/\.com$/i, "")
    .replace(/\.io$/i, "")
    .replace(/[^a-z0-9]+/g, "");
}

function getInitials(name: string) {
  const words = name
    .replace(/\b(api|mcp|knowledge|asset)\b/gi, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length > 1) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export default function ConnectorLogo({ name, accent }: ConnectorLogoProps) {
  const slug = toLogoSlug(name);
  const icon = LOCAL_LOGOS[slug];

  return (
    <span
      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
      style={{
        background: `${accent}18`,
        border: `1px solid ${accent}38`,
        color: accent,
      }}
      aria-hidden="true"
      title={name}
    >
      {icon ? (
        <svg
          viewBox="0 0 24 24"
          className="w-4 h-4"
          fill="currentColor"
          role="img"
          aria-label={`${name} logo`}
        >
          <path d={icon.path} />
        </svg>
      ) : (
        <span className="leading-none">{getInitials(name)}</span>
      )}
    </span>
  );
}
