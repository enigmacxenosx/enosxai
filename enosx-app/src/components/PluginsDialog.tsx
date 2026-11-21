import { Check, ChevronDown, ExternalLink, Filter, Plus, Puzzle, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useDarkMode } from "@/contexts/DarkModeContext";
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
  const { config } = useDarkMode();
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

  const filteredConnectors = useMemo(
    () => CONNECTOR_CATALOG.filter((connector) =>
      connectorMatches(connector, query) && (!connectedOnly || isConnected(connector)),
    ),
    [connectedOnly, githubAccounts.length, query, savedAccounts],
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
    <div className="fixed inset-0 z-[80] flex bg-[#151515] text-white">
      <section role="dialog" aria-modal="true" aria-labelledby="plugins-title" className="flex min-h-0 w-full">
        <aside className="hidden w-[252px] shrink-0 flex-col border-r border-white/[0.07] bg-[#191919] px-3 py-4 md:flex">
          <div className="mb-7 flex items-center justify-between px-2">
            <div className="flex items-center gap-2 font-serif text-[21px] font-semibold tracking-tight"><Puzzle size={20} style={{ color: config.accent }} />enosx</div>
            <button type="button" onClick={onClose} aria-label="Close plugins" className="rounded-lg p-2 text-white/40 transition hover:bg-white/[0.07] hover:text-white"><X size={16} /></button>
          </div>
          <nav aria-label="Main navigation" className="space-y-1">
            <button type="button" onClick={onClose} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm text-white/65 transition hover:bg-white/[0.06] hover:text-white"><ExternalLink size={16} />Chat</button>
            <button type="button" aria-current="page" className="flex h-10 w-full items-center gap-3 rounded-lg bg-white/[0.09] px-3 text-left text-sm font-medium text-white"><Puzzle size={16} style={{ color: config.accent }} />Plugins</button>
          </nav>
          <div className="mt-8 px-3 text-xs font-medium text-white/35">Workspace</div>
          <div className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/65"><span className="grid h-6 w-6 place-items-center rounded-md bg-white/[0.08] text-[10px] font-semibold">E</span>ENOSX AI</div>
          <div className="mt-auto rounded-xl border border-white/[0.08] bg-white/[0.035] p-3"><div className="text-xs font-semibold">ENOSX STUDIO</div><div className="mt-1 text-[11px] text-white/40">Connected tools, in one place</div></div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[62px] shrink-0 items-center gap-3 border-b border-white/[0.07] px-4 sm:px-7">
            <div className="flex-1"><h2 id="plugins-title" className="text-[17px] font-semibold tracking-tight">Plugins</h2></div>
            <button type="button" onClick={browseConnectors} className="hidden h-9 items-center rounded-lg border border-white/[0.12] px-3 text-xs font-medium text-white/75 transition hover:bg-white/[0.06] sm:inline-flex">Manage Connectors</button>
            <div className="relative">
              <button type="button" aria-expanded={showAddMenu} onClick={() => { setShowAddMenu((value) => !value); setShowFilter(false); }} className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-white transition hover:brightness-110" style={{ background: config.accent }}><Plus size={14} />Create<ChevronDown size={13} /></button>
              {showAddMenu && <div className="absolute right-0 top-11 z-10 w-48 rounded-xl border border-white/10 bg-[#202027] p-1.5 shadow-xl"><button type="button" onClick={browseConnectors} className="w-full rounded-lg px-3 py-2.5 text-left text-xs text-white/80 hover:bg-white/[0.07]">Browse connectors</button></div>}
            </div>
            <button type="button" onClick={onClose} aria-label="Close plugins" className="rounded-lg p-2 text-white/45 transition hover:bg-white/[0.08] hover:text-white md:hidden"><X size={17} /></button>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-10 pt-5 sm:px-7 sm:pt-7">
            <div className="mx-auto max-w-[980px]">
              {activeTab === "All" && <section className="mb-7">
                <div className="mb-3 text-[13px] font-semibold text-white/85">Bring your tools into ENOSX</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {(["github", "vercel", "shopify"] as const).map((id) => {
                    const connector = CONNECTOR_CATALOG.find((item) => item.id === id);
                    if (!connector) return null;
                    const copy = id === "github" ? "Work with your repositories and code." : id === "vercel" ? "Keep deployments and projects close." : "Connect your store and product data.";
                    return <button key={id} type="button" onClick={() => { setQuery(connector.name); browseConnectors(); }} className="flex min-h-[104px] items-start gap-3 rounded-xl border border-white/[0.09] bg-[#1d1d1d] p-3.5 text-left transition hover:border-white/[0.18] hover:bg-[#222]">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.045]"><ConnectorLogo name={connector.name} accent="#18181b" size={21} /></span>
                      <span className="min-w-0"><span className="block text-[13px] font-semibold text-white/90">Connect {connector.name}</span><span className="mt-1 block text-xs leading-relaxed text-white/50">{copy}</span></span>
                    </button>;
                  })}
                </div>
              </section>}

              <label className="mb-4 flex h-10 items-center gap-2.5 rounded-lg border border-white/[0.12] bg-transparent px-3.5 text-white/45 transition focus-within:border-white/25">
                <Search size={15} className="shrink-0" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search plugins" aria-label="Search plugins" className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35" />
                {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-white/40 hover:text-white"><X size={14} /></button>}
              </label>

              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1 overflow-x-auto" role="tablist" aria-label="Plugin categories">
                  {(["All", "Connectors"] as TabName[]).map((tab) => <button key={tab} id={`plugins-tab-${tab.toLowerCase()}`} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className="rounded-lg px-3 py-2 text-[13px] transition" style={activeTab === tab ? { background: "rgba(255,255,255,.09)", color: "white" } : { color: "rgba(255,255,255,.52)" }}>{tab}</button>)}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <button type="button" aria-label="Filter plugins" aria-expanded={showFilter} onClick={() => { setShowFilter((value) => !value); setShowAddMenu(false); }} className={`flex h-9 items-center gap-2 rounded-lg border px-3 text-xs transition ${connectedOnly ? "text-white" : "border-white/[0.1] text-white/60 hover:bg-white/[0.05] hover:text-white"}`} style={connectedOnly ? { borderColor: `rgba(${config.accentRgb},.35)`, background: `rgba(${config.accentRgb},.12)` } : undefined}><Filter size={14} />Filter</button>
                    {showFilter && <div className="absolute right-0 top-11 z-10 w-48 rounded-xl border border-white/10 bg-[#202027] p-2 shadow-xl"><button type="button" onClick={() => setConnectedOnly((value) => !value)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-white/75 hover:bg-white/[0.06]"><span className={`flex h-4 w-4 items-center justify-center rounded border ${connectedOnly ? "border-white/70 bg-white/15" : "border-white/20"}`}>{connectedOnly && <Check size={11} />}</span>Connected only</button></div>}
                  </div>
                </div>
              </div>

              <section>
                {sectionHeader(activeTab === "All" ? "Most used" : "Connectors", activeTab === "All")}
                <div className="grid gap-3 sm:grid-cols-2">
                  {filteredConnectors.map((connector) => {
                    const connected = isConnected(connector);
                    const status = oauthStatus[connector.id] || "loading";
                    return <article key={connector.id} className="flex min-h-[90px] min-w-0 items-center gap-3 rounded-xl border border-white/[0.085] bg-[#1c1c1c] p-3 transition hover:border-white/[0.16]">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-white/[0.08] bg-white/[0.045]"><ConnectorLogo name={connector.name} accent="#18181b" size={24} /></span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5"><h4 className="text-[13px] font-semibold text-white/90">{connectorTitle(connector)}</h4><span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-white/45">{connector.kind}</span></div>
                        <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-white/48">{CONNECTOR_DESCRIPTIONS[connector.id]}</p>
                        <p className="mt-1 text-[10px] text-white/30">By {CONNECTOR_PROVIDERS[connector.id]}</p>
                      </div>
                      <div className="shrink-0">{connected ? renderConnectorAction(connector, true) : status === "ready" ? renderConnectorAction(connector) : <span className="text-[10px] text-white/35">{status === "needs-setup" ? "Setup required" : status === "unavailable" ? "Unavailable" : "Checking"}</span>}</div>
                    </article>;
                  })}
                  {filteredConnectors.length === 0 && <p className="col-span-full py-8 text-center text-xs text-white/40">No connectors match your search or filter.</p>}
                </div>
                {activeTab === "All" && <p className="mt-4 text-[10px] leading-relaxed text-white/30">Only integrations supported by ENOSX are listed. Google account access provides identity only, not Gmail inbox access.</p>}
              </section>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
