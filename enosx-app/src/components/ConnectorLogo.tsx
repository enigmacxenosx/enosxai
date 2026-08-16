import { useMemo, useState } from "react";

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

function toLogoSlug(name: string) {
  if (LOGO_SLUG_OVERRIDES[name]) return LOGO_SLUG_OVERRIDES[name];

  return name
    .replace(/\s+(API|Knowledge|Asset)$/i, "")
    .replace(/\s+Worker Bindings$/i, "")
    .toLowerCase()
    .replace(/\.com$/i, "")
    .replace(/\.io$/i, "")
    .replace(/\.com$/i, "")
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
  const [failed, setFailed] = useState(false);
  const slug = useMemo(() => toLogoSlug(name), [name]);
  const accentHex = accent.replace("#", "") || "ffffff";
  const logoUrl = `https://cdn.simpleicons.org/${slug}/${accentHex}`;

  return (
    <span
      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden"
      style={{
        background: `${accent}18`,
        border: `1px solid ${accent}38`,
        color: accent,
      }}
      aria-hidden="true"
    >
      {!failed ? (
        <img
          src={logoUrl}
          alt=""
          loading="lazy"
          decoding="async"
          className="w-4 h-4 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}
