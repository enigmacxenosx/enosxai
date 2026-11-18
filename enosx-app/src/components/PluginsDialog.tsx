import { Check, ChevronDown, ExternalLink, Filter, Plus, Puzzle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";
import { useGitHub } from "@/hooks/useGitHub";
import { CONNECTOR_CATALOG, type ConnectorCatalogItem } from "@/lib/connectorCatalog";
import ConnectorLogo from "./ConnectorLogo";

interface PluginsDialogProps {
  open: boolean;
  onClose: () => void;
}

type SavedConnectorAccount = {
  connector: string;
  id?: string;
  username?: string;
  name?: string;
  email?: string;
};

type OAuthStatus = "loading" | "ready" | "needs-setup" | "unavailable";
type TabName = "All" | "Connectors";

const CONNECTOR_ACCOUNTS_KEY = "enosx-connector-accounts";
const CONNECTOR_DESCRIPTIONS: Record<string, string> = {
  github: "Repositories, branches, and code tools",
  vercel: "Projects, deployments, and domains",
  shopify: "Store data and products",
  email: "Google account identity only — no Gmail inbox access",
};
const CONNECTOR_PROVIDERS: Record<string, string> = {
  github: "GitHub",
  vercel: "Vercel",
  shopify: "Shopify",
  email: "Google",
};

function readSavedAccounts(): SavedConnectorAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(CONNECTOR_ACCOUNTS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.connector === "string") : [];
  } catch {
    return [];
  }
}

function connectorTitle(connector: ConnectorCatalogItem) {
  return connector.id === "email" ? "Google account" : connector.name;
}

function connectorMatches(connector: ConnectorCatalogItem, query: string) {
  const searchable = `${connectorTitle(connector)} ${connector.name} ${CONNECTOR_DESCRIPTIONS[connector.id] || ""} ${connector.kind}`;
  return searchable.toLowerCase().includes(query.trim().toLowerCase());
}

export default function PluginsDialog({ open, onClose }: PluginsDialogProps) {
  const { config } = useTheme();
  const { accounts: githubAccounts, connectWithOAuth, removeAccount } = useGitHub();
  const [activeTab, setActiveTab] = useState<TabName>("All");
  const [query, setQuery] = useState("");
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [oauthStatus, setOauthStatus] = useState<Record<string, OAuthStatus>>({});
  const [savedAccounts, setSavedAccounts] = useState<SavedConnectorAccount[]>(readSavedAccounts);
  const [connecting, setConnecting] = useState<string | null>(null);

  const isConnected = (connector: ConnectorCatalogItem) => connector.id === "github"
    ? githubAccounts.length > 0
    : savedAccounts.some((account) => account.connector === connector.id);

  const connectedAccountName = (connector: ConnectorCatalogItem) => {
    if (connector.id === "github") return githubAccounts[0]?.username;
    const account = savedAccounts.find((item) => item.connector === connector.id);
    return account?.username || account?.email || account?.name;
  };

  const filteredConnectors = useMemo(
    () => CONNECTOR_CATALOG.filter((connector) =>
      connectorMatches(connector, query) && (!connectedOnly || isConnected(connector)),
    ),
    [connectedOnly, githubAccounts.length, query, savedAccounts],
  );
  const connectedPlugins = useMemo(
    () => CONNECTOR_CATALOG.filter((connector) => isConnected(connector) && connectorMatches(connector, query)),
    [githubAccounts.length, query, savedAccounts],
  );

  useEffect(() => {
    if (!open) return;
    const refreshStatuses = async () => {
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
    };
    void refreshStatuses();
  }, [open]);

  useEffect(() => {
    const syncAccounts = () => setSavedAccounts(readSavedAccounts());
    window.addEventListener("storage", syncAccounts);
    window.addEventListener("enosx:connector-accounts-updated", syncAccounts);
    return () => {
      window.removeEventListener("storage", syncAccounts);
      window.removeEventListener("enosx:connector-accounts-updated", syncAccounts);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  const connect = async (connector: ConnectorCatalogItem) => {
    if (connecting) return;
    if (connector.id === "github") {
      setConnecting(connector.id);
      try {
        if (await connectWithOAuth()) toast.success("GitHub connected");
      } finally {
        setConnecting(null);
      }
      return;
    }

    const shop = connector.id === "shopify" ? window.prompt("Enter your Shopify shop domain (example.myshopify.com)") : null;
    if (connector.id === "shopify" && !shop) return;
    const popup = window.open(
      `/api/connectors/${connector.id}/oauth/start${shop ? `?shop=${encodeURIComponent(shop)}` : ""}`,
      `enosx-${connector.id}-oauth`,
      "popup,width=620,height=760",
    );
    if (!popup) {
      toast.error("Allow pop-ups to connect this service");
      return;
    }

    setConnecting(connector.id);
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
      if (event.origin !== window.location.origin || event.data?.type !== "enosx-connector-oauth" || event.data.payload?.connector !== connector.id) return;
      const account = event.data.payload?.account as SavedConnectorAccount | undefined;
      if (account) {
        const next = [...readSavedAccounts().filter((item) => item.connector !== connector.id), { ...account, connector: connector.id }];
        localStorage.setItem(CONNECTOR_ACCOUNTS_KEY, JSON.stringify(next));
        setSavedAccounts(next);
        window.dispatchEvent(new Event("enosx:connector-accounts-updated"));
        toast.success(`${connectorTitle(connector)} connected`);
      }
      finish();
    };
    window.addEventListener("message", onMessage);
    const closePoll = window.setInterval(() => { if (popup.closed) finish(); }, 500);
    const timeout = window.setTimeout(finish, 180_000);
  };

  const disconnect = (connector: ConnectorCatalogItem) => {
    if (connector.id === "github") {
      githubAccounts.forEach((account) => removeAccount(account.id));
      window.dispatchEvent(new Event("enosx:connector-accounts-updated"));
      return;
    }
    const next = savedAccounts.filter((account) => account.connector !== connector.id);
    localStorage.setItem(CONNECTOR_ACCOUNTS_KEY, JSON.stringify(next));
    setSavedAccounts(next);
    window.dispatchEvent(new Event("enosx:connector-accounts-updated"));
  };

  const browseConnectors = () => {
    setActiveTab("Connectors");
    setShowAddMenu(false);
  };

  const renderConnectorAction = (connector: ConnectorCatalogItem, compact = false) => {
    const connected = isConnected(connector);
    const status = oauthStatus[connector.id] || "loading";
    if (connected) {
      return (
        <button
          type="button"
          onClick={() => disconnect(connector)}
          className={`shrink-0 rounded-lg text-[10px] text-white/45 transition hover:bg-white/[0.07] hover:text-white ${compact ? "px-2 py-1" : "px-2.5 py-1.5"}`}
        >Disconnect</button>
      );
    }
    if (status === "ready") {
      return (
        <button
          type="button"
          onClick={() => void connect(connector)}
          disabled={Boolean(connecting)}
          className={`shrink-0 rounded-lg font-semibold transition disabled:opacity-50 ${compact ? "px-2.5 py-1 text-[10px]" : "px-3 py-1.5 text-[11px]"}`}
          style={{ color: config.accent, background: `rgba(${config.accentRgb}, 0.12)`, border: `1px solid rgba(${config.accentRgb}, 0.24)` }}
        >{connecting === connector.id ? "Connecting…" : "Connect"}</button>
      );
    }
    return <span className="shrink-0 text-[10px] text-white/35">{status === "needs-setup" ? "Setup required" : status === "unavailable" ? "Unavailable" : "Checking…"}</span>;
  };

  const sectionHeader = (title: string, showAll?: boolean) => (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-semibold text-white/90">{title}</h3>
      {showAll && <button type="button" onClick={browseConnectors} className="inline-flex items-center gap-1 text-xs text-white/65 transition hover:text-white">Show all <ExternalLink size={12} /></button>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plugins-title"
        className="relative flex max-h-[min(860px,calc(100dvh-24px))] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border text-white shadow-2xl sm:max-h-[min(860px,calc(100dvh-48px))]"
        style={{
          background: `linear-gradient(155deg, rgba(${config.accentRgb}, 0.055), transparent 28%), ${config.bg}`,
          borderColor: `rgba(${config.accentRgb}, 0.2)`,
          boxShadow: `0 28px 90px rgba(0,0,0,.65), 0 0 40px rgba(${config.accentRgb},.08)`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border" style={{ color: config.accent, background: `rgba(${config.accentRgb},.12)`, borderColor: `rgba(${config.accentRgb},.25)` }}><Puzzle size={18} /></span>
            <div>
              <h2 id="plugins-title" className="font-serif text-[24px] leading-none tracking-tight">Plugins</h2>
              <p className="mt-1 text-[11px] text-white/40">Your connected services and available integrations.</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" aria-label="More plugin options" className="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.07] hover:text-white"><span className="text-lg leading-none">···</span></button>
            <button type="button" onClick={onClose} aria-label="Close plugins" className="rounded-lg p-2 text-white/45 transition hover:bg-white/[0.08] hover:text-white"><X size={18} /></button>
          </div>
        </header>

        <div className="flex flex-col gap-3 border-b border-white/[0.07] px-5 pb-4 sm:flex-row sm:items-center sm:px-7">
          <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.07] px-3.5 py-2.5 focus-within:border-white/20">
            <Search size={15} className="shrink-0 text-white/45" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" aria-label="Search plugins" className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35" />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-white/40 hover:text-white"><X size={14} /></button>}
          </label>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-white/[0.06] p-0.5" role="tablist" aria-label="Plugin categories">
              {(["All", "Connectors"] as TabName[]).map((tab) => (
                <button key={tab} id={`plugins-tab-${tab.toLowerCase()}`} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className="rounded-[9px] px-3 py-1.5 text-xs transition" style={activeTab === tab ? { background: `rgba(${config.accentRgb},.18)`, color: config.accent, boxShadow: `inset 0 0 0 1px rgba(${config.accentRgb},.3)` } : { color: "rgba(255,255,255,.62)" }}>{tab}</button>
              ))}
            </div>
            <div className="relative">
              <button type="button" aria-label="Filter plugins" aria-expanded={showFilter} onClick={() => { setShowFilter((value) => !value); setShowAddMenu(false); }} className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${connectedOnly ? "text-white" : "border-transparent text-white/50 hover:bg-white/[0.06] hover:text-white"}`} style={connectedOnly ? { borderColor: `rgba(${config.accentRgb},.35)`, background: `rgba(${config.accentRgb},.12)` } : undefined}><Filter size={15} /></button>
              {showFilter && <div className="absolute right-0 top-11 z-10 w-48 rounded-xl border border-white/10 bg-[#202027] p-2 shadow-xl"><button type="button" onClick={() => setConnectedOnly((value) => !value)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-white/75 hover:bg-white/[0.06]"><span className={`flex h-4 w-4 items-center justify-center rounded border ${connectedOnly ? "border-white/70 bg-white/15" : "border-white/20"}`}>{connectedOnly && <Check size={11} />}</span>Connected only</button></div>}
            </div>
            <div className="relative">
              <button type="button" aria-expanded={showAddMenu} onClick={() => { setShowAddMenu((value) => !value); setShowFilter(false); }} className="flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold text-white transition hover:brightness-110" style={{ background: config.accent }}><Plus size={14} /> Add <ChevronDown size={13} /></button>
              {showAddMenu && <div className="absolute right-0 top-11 z-10 w-48 rounded-xl border border-white/10 bg-[#202027] p-1.5 shadow-xl"><button type="button" onClick={browseConnectors} className="w-full rounded-lg px-3 py-2.5 text-left text-xs text-white/80 hover:bg-white/[0.07]">Browse connectors</button></div>}
            </div>
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {activeTab === "All" && (
            <section className="mb-7">
              {sectionHeader("Your plugins")}
              <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015]">
                {connectedPlugins.length > 0 ? connectedPlugins.map((connector, index) => (
                  <div key={connector.id} className={`flex items-center gap-3 px-3 py-3 ${index ? "border-t border-white/[0.06]" : ""}`}>
                    <ConnectorLogo name={connector.name} accent="#18181b" size={30} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><span className="text-sm font-medium">{connectorTitle(connector)}</span><Check size={13} className="text-emerald-400" /></div>
                      <p className="mt-0.5 truncate text-[11px] text-white/45">Built-in integration · By {CONNECTOR_PROVIDERS[connector.id]}</p>
                    </div>
                    {renderConnectorAction(connector, true)}
                  </div>
                )) : (
                  <div className="flex flex-col items-start gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-sm text-white/75">No connected services yet</p><p className="mt-1 text-[11px] text-white/40">Connect a supported service to see it here.</p></div>
                    <button type="button" onClick={browseConnectors} className="rounded-lg px-3 py-2 text-xs font-medium transition" style={{ color: config.accent, background: `rgba(${config.accentRgb},.12)` }}>Browse connectors</button>
                  </div>
                )}
              </div>
            </section>
          )}

          <section>
            {sectionHeader(activeTab === "All" ? "Most used" : "Connectors", activeTab === "All")}
            <div className="grid gap-x-8 sm:grid-cols-2">
              {filteredConnectors.map((connector, index) => {
                const connected = isConnected(connector);
                const status = oauthStatus[connector.id] || "loading";
                const indexInRow = index % 2;
                return (
                  <article key={connector.id} className={`flex min-w-0 items-start gap-3 border-white/[0.08] py-3.5 ${index > 1 ? "border-t" : ""} ${indexInRow === 1 ? "sm:border-t-0" : ""}`}>
                    <ConnectorLogo name={connector.name} accent="#18181b" size={32} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5"><h4 className="text-sm font-medium text-white/90">{connectorTitle(connector)}</h4><span className="text-white/35" aria-hidden="true">◉</span><span className="text-[10px] text-white/40">{connector.kind}</span></div>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">{CONNECTOR_DESCRIPTIONS[connector.id]}</p>
                      <p className="mt-1.5 text-[10px] text-white/35">Connector · By {CONNECTOR_PROVIDERS[connector.id]}</p>
                    </div>
                    <div className="pt-0.5">{connected ? renderConnectorAction(connector, true) : status === "ready" ? renderConnectorAction(connector) : <span className="text-[10px] text-white/35">{status === "needs-setup" ? "Setup required" : status === "unavailable" ? "Unavailable" : "Checking"}</span>}</div>
                  </article>
                );
              })}
              {filteredConnectors.length === 0 && <p className="col-span-full py-8 text-center text-xs text-white/40">No connectors match your search or filter.</p>}
            </div>
            {activeTab === "All" && <p className="mt-3 text-[10px] leading-relaxed text-white/30">Only integrations supported by ENOSX are listed. Google account access provides identity only, not Gmail inbox access.</p>}
          </section>
        </main>
      </section>
    </div>
  );
}
