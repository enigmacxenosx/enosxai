import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, Check, ChevronRight, Loader2, Plus, RefreshCw, Unplug } from "lucide-react";
import { useGitHub } from "@/hooks/useGitHub";
import { CONNECTOR_CATALOG } from "@/lib/connectorCatalog";
import ConnectorLogo from "./ConnectorLogo";

type OAuthStatus = "loading" | "ready" | "needs-setup" | "unavailable";
type SavedConnectorAccount = { connector: string; id?: string; username?: string; name?: string; email?: string; token?: string };

const ACCOUNT_STORAGE_KEY = "enosx-connector-accounts";
const CONNECTOR_DESCRIPTIONS: Record<string, string> = {
  github: "Repositories, branches, and code tools",
  vercel: "Projects, deployments, and domains",
  shopify: "Store data and products",
  email: "Google account identity only (no Gmail inbox access)",
};

function readSavedAccounts(): SavedConnectorAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(ACCOUNT_STORAGE_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.connector === "string") : [];
  } catch {
    return [];
  }
}

interface ConnectorsSettingsPanelProps {
  accentColor: string;
  accentRgb: string;
}

export default function ConnectorsSettingsPanel({ accentColor, accentRgb }: ConnectorsSettingsPanelProps) {
  const { accounts: githubAccounts, connectWithOAuth, removeAccount } = useGitHub();
  const [savedAccounts, setSavedAccounts] = useState<SavedConnectorAccount[]>(readSavedAccounts);
  const [oauthStatus, setOauthStatus] = useState<Record<string, OAuthStatus>>({});
  const [connecting, setConnecting] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showSupportedDetails, setShowSupportedDetails] = useState(false);

  const refreshStatuses = useCallback(async () => {
    setRefreshing(true);
    const results = await Promise.all(CONNECTOR_CATALOG.map(async ({ id }) => {
      try {
        const response = await fetch(`/api/connectors/${id}/oauth/status`, { cache: "no-store" });
        if (!response.ok) return [id, "unavailable"] as const;
        const result = await response.json() as { configured?: boolean };
        return [id, result.configured ? "ready" : "needs-setup"] as const;
      } catch {
        return [id, "unavailable"] as const;
      }
    }));
    setOauthStatus(Object.fromEntries(results));
    setRefreshing(false);
  }, []);

  useEffect(() => { void refreshStatuses(); }, [refreshStatuses]);
  useEffect(() => {
    const sync = () => setSavedAccounts(readSavedAccounts());
    window.addEventListener("storage", sync);
    window.addEventListener("enosx:connector-accounts-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("enosx:connector-accounts-updated", sync);
    };
  }, []);

  const accountByConnector = useMemo(() => {
    const map = new Map<string, SavedConnectorAccount>();
    for (const account of savedAccounts) map.set(account.connector, account);
    return map;
  }, [savedAccounts]);

  const connect = async (connectorId: string) => {
    if (connecting) return;
    if (connectorId === "github") {
      setConnecting(connectorId);
      try { await connectWithOAuth(); } finally { setConnecting(null); }
      return;
    }

    const shop = connectorId === "shopify" ? window.prompt("Enter your Shopify shop domain (example.myshopify.com)") : null;
    if (connectorId === "shopify" && !shop) return;
    const popup = window.open(`/api/connectors/${connectorId}/oauth/start${shop ? `?shop=${encodeURIComponent(shop)}` : ""}`, `enosx-${connectorId}-oauth`, "popup,width=620,height=760");
    if (!popup) return;

    setConnecting(connectorId);
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.removeEventListener("message", onMessage);
      window.clearInterval(closePoll);
      window.clearTimeout(timeout);
      setConnecting(null);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== "enosx-connector-oauth" || event.data.payload?.connector !== connectorId) return;
      const account = event.data.payload?.account as SavedConnectorAccount | undefined;
      if (account) {
        const next = [...readSavedAccounts().filter((item) => item.connector !== connectorId), { ...account, connector: connectorId }];
        localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(next));
        setSavedAccounts(next);
        window.dispatchEvent(new Event("enosx:connector-accounts-updated"));
      }
      finish();
    };
    window.addEventListener("message", onMessage);
    const closePoll = window.setInterval(() => { if (popup.closed) finish(); }, 500);
    const timeout = window.setTimeout(finish, 180_000);
  };

  const disconnect = (connectorId: string) => {
    if (connectorId === "github") {
      githubAccounts.forEach((account) => removeAccount(account.id));
      window.dispatchEvent(new Event("enosx:connector-accounts-updated"));
      return;
    }
    const next = readSavedAccounts().filter((account) => account.connector !== connectorId);
    localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(next));
    setSavedAccounts(next);
    window.dispatchEvent(new Event("enosx:connector-accounts-updated"));
  };

  const githubAccount = githubAccounts[0];
  const connectedName = (id: string) => id === "github"
    ? githubAccount?.username
    : accountByConnector.get(id)?.username || accountByConnector.get(id)?.email || accountByConnector.get(id)?.name;

  return (
    <div className="px-5 py-4 space-y-3" aria-label="Manage connectors">
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] pb-3">
        <div>
          <h2 className="text-sm font-semibold text-white/90">Manage connectors</h2>
          <p className="mt-1 text-[11px] text-white/45">Connect external accounts to ENOSX AI.</p>
        </div>
        <button type="button" onClick={() => void refreshStatuses()} disabled={refreshing} aria-label="Refresh connector status" title="Refresh connector status" className="flex h-8 w-8 items-center justify-center rounded-lg text-white/55 transition hover:bg-white/[0.07] hover:text-white disabled:opacity-50">
          {refreshing ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={14} />}
        </button>
      </div>

      <button type="button" onClick={() => setShowSupportedDetails((visible) => !visible)} aria-expanded={showSupportedDetails} className="flex w-full items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 text-left transition hover:bg-white/[0.05]">
        <span className="flex items-center gap-2 text-xs font-medium text-white/75"><Plus size={15} style={{ color: accentColor }} />Add connectors</span>
        <span className="rounded-full px-2 py-0.5 text-[10px] text-white/50" style={{ background: `rgba(${accentRgb},0.12)` }}>4 supported</span>
      </button>
      {showSupportedDetails && <p className="rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2 text-[10px] leading-relaxed text-white/45">ENOSX currently supports GitHub, Vercel, Shopify, and Google account identity. Other services are not connected by this app yet.</p>}

      <div className="overflow-hidden rounded-xl border border-white/[0.07]">
        {CONNECTOR_CATALOG.map((connector, index) => {
          const isConnected = connector.id === "github" ? Boolean(githubAccount) : Boolean(accountByConnector.get(connector.id));
          const status = oauthStatus[connector.id] || "loading";
          const displayStatus = isConnected ? "Connected on this device" : status === "ready" ? "Ready to connect" : status === "needs-setup" ? "Needs server setup" : status === "unavailable" ? "Check unavailable" : "Checking setup…";
          const detail = isConnected ? connectedName(connector.id) || "Account connected" : status === "needs-setup" ? "OAuth credentials are not configured on the app server." : status === "unavailable" ? "The app server could not be reached. Retry the status check." : status === "loading" ? "Checking app-server OAuth setup." : CONNECTOR_DESCRIPTIONS[connector.id];
          const statusColor = isConnected ? "#4ade80" : status === "ready" ? "#93c5fd" : status === "needs-setup" ? "#fbbf24" : status === "unavailable" ? "#fb7185" : "rgba(255,255,255,0.48)";
          return (
            <div key={connector.id} className={`flex items-center gap-3 px-3 py-3 ${index ? "border-t border-white/[0.06]" : ""}`}>
              <ConnectorLogo name={connector.name} accent={statusColor} size={30} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-xs font-medium text-white/90">{connector.id === "email" ? "Email (Google)" : connector.name}</span>
                  <span className="hidden rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40 sm:inline">{connector.kind}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: statusColor }}>
                  {status === "unavailable" || status === "needs-setup" ? <AlertCircle size={10} /> : isConnected ? <Check size={10} /> : status === "loading" ? <Loader2 size={10} className="animate-spin" /> : null}
                  <span>{displayStatus}</span>
                </div>
                <div className="mt-0.5 truncate text-[10px] text-white/35">{detail}</div>
              </div>
              {isConnected ? (
                <button type="button" onClick={() => disconnect(connector.id)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1.5 text-[10px] text-white/55 transition hover:bg-white/[0.07] hover:text-white" aria-label={`Disconnect ${connector.name}`}>
                  <Unplug size={12} /><span className="hidden sm:inline">Disconnect</span>
                </button>
              ) : status === "ready" ? (
                <button type="button" onClick={() => void connect(connector.id)} disabled={Boolean(connecting)} className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold transition disabled:opacity-50" style={{ color: accentColor, background: `rgba(${accentRgb},0.1)`, border: `1px solid rgba(${accentRgb},0.22)` }}>
                  {connecting === connector.id ? <Loader2 size={11} className="animate-spin" /> : null}Connect
                </button>
              ) : (
                <span className="shrink-0 text-[10px] text-white/35">{status === "loading" ? "Checking" : status === "unavailable" ? "Retry" : "Setup"}</span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2.5 text-[10px] leading-relaxed text-white/40">
        <ChevronRight size={12} className="mt-0.5 shrink-0" />
        Account connection details are stored in this browser. “Ready to connect” confirms server OAuth setup, not a completed sign-in or live provider API test.
      </div>
    </div>
  );
}
