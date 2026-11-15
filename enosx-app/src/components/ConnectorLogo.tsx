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
  size?: number;
  /** Renders the glyph alone, in the current text color, without the badge. */
  plain?: boolean;
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

export default function ConnectorLogo({ name, accent, size = 28, plain = false }: ConnectorLogoProps) {
  const slug = toLogoSlug(name);
  const icon = LOCAL_LOGOS[slug];
  const glyph = Math.round(size * 0.57);

  if (plain) {
    return (
      <span
        className="flex shrink-0 items-center justify-center"
        style={{ width: size, height: size, color: "currentColor" }}
        aria-hidden="true"
        title={name}
      >
        {icon ? (
          <svg viewBox="0 0 24 24" style={{ width: size, height: size }} fill="currentColor" role="img" aria-label={`${name} logo`}>
            <path d={icon.path} />
          </svg>
        ) : (
          <span className="text-[10px] font-semibold leading-none">{getInitials(name)}</span>
        )}
      </span>
    );
  }

  return (
    <span
      className="flex items-center justify-center font-bold shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        background: icon ? "rgba(255,255,255,.94)" : `${accent}18`,
        border: `1px solid ${icon ? "rgba(255,255,255,.18)" : `${accent}38`}`,
        color: icon ? `#${icon.hex}` : accent,
        fontSize: Math.round(size * 0.36),
      }}
      aria-hidden="true"
      title={name}
    >
      {icon ? (
        <svg
          viewBox="0 0 24 24"
          style={{ width: glyph, height: glyph }}
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
