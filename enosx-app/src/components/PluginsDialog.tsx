import {
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  Filter,
  Plus,
  Puzzle,
  Search,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { showError } from "@/lib/errorReporting";
import { useTheme } from "@/contexts/ThemeContext";
import { useGitHub } from "@/hooks/useGitHub";
import { CONNECTOR_CATALOG, type ConnectorCatalogItem } from "@/lib/connectorCatalog";
import ConnectorLogo from "./ConnectorLogo";

interface PluginsDialogProps {
  open: boolean;
  onClose: () => void;
}

type PluginDefinition = {
  name: string;
  description: string;
  capability: string;
  prompt: string;
  custom?: boolean;
};

type SavedConnectorAccount = {
  connector: string;
  id?: string;
  username?: string;
  name?: string;
  email?: string;
};

type OAuthStatus = "loading" | "ready" | "needs-setup" | "unavailable";
type TabName = "All" | "Connectors" | "Skills";

const CUSTOM_SKILLS_KEY = "enosx-custom-skills";
const CONNECTOR_ACCOUNTS_KEY = "enosx-connector-accounts";

const BUILT_IN_SKILLS: PluginDefinition[] = [
  {
    name: "Research brief",
    description: "Turn a topic into a structured, source-aware brief.",
    capability: "Research",
    prompt: "Research this topic, compare the strongest available sources, extract the key findings, separate facts from inferences, and produce a concise decision-ready brief with next steps.",
  },
  {
    name: "Repository review",
    description: "Understand a codebase and turn it into an implementation plan.",
    capability: "Codebase analysis",
    prompt: "Inspect the relevant repository context, explain the current architecture, identify the files that matter, and create a prioritized implementation plan with risks, tests, and a clear first step.",
  },
  {
    name: "File analysis",
    description: "Extract decisions and next actions from an uploaded file.",
    capability: "Documents",
    prompt: "Analyze the attached file, summarize what matters, identify decisions, risks, unanswered questions, and convert the findings into a practical action list.",
  },
  {
    name: "Planning partner",
    description: "Turn an unstructured idea into a clear, achievable plan.",
    capability: "Planning",
    prompt: "Turn this idea into a focused plan. Clarify the objective, assumptions, milestones, dependencies, risks, and the smallest useful next action.",
  },
  {
    name: "Creative brief",
    description: "Develop a creative concept into a usable visual brief.",
    capability: "Creative direction",
    prompt: "Develop this creative idea into a polished visual brief with audience, message, composition, mood, color direction, text guidance, and three useful variations.",
  },
  {
    name: "Visual story",
    description: "Turn metrics or research findings into a narrated visual sequence.",
    capability: "Data storytelling",
    prompt: "Turn this data into a presentation-ready visual story. Establish the baseline, identify the turning point, and explain the outcome. For each scene, provide a title, narration, recommended visual, exact data emphasis, and restrained animation direction. Do not invent values; label assumptions and include a reduced-motion alternative.",
  },
  {
    name: "Asset bundle",
    description: "Organize uploaded images and documents into a downloadable ZIP package.",
    capability: "File workflow",
    prompt: "Package the uploaded images and documents into a clean downloadable ZIP bundle. Preserve readable filenames, group related assets when useful, list the files included, and call out any unsupported or missing files before creating the archive.",
  },
];

const CONNECTOR_DESCRIPTIONS: Record<string, string> = {
  github: "Repositories, branches, and code tools",
  vercel: "Projects, deployments, and domains",
  shopify: "Store data and products",
  email: "Google account identity only; no Gmail inbox access",
};

function readCustomSkills(): PluginDefinition[] {
  try {
    const value = JSON.parse(localStorage.getItem(CUSTOM_SKILLS_KEY) || "[]");
    return Array.isArray(value)
      ? value.filter((item) => item && typeof item.name === "string" && typeof item.prompt === "string")
      : [];
  } catch {
    return [];
  }
}

function readSavedAccounts(): SavedConnectorAccount[] {
  try {
    const value = JSON.parse(localStorage.getItem(CONNECTOR_ACCOUNTS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.connector === "string") : [];
  } catch {
    return [];
  }
}

function getConnectorName(connector: ConnectorCatalogItem) {
  return connector.id === "email" ? "Google account" : connector.name;
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
  const [customSkills, setCustomSkills] = useState<PluginDefinition[]>(readCustomSkills);
  const [copiedName, setCopiedName] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [showSkillForm, setShowSkillForm] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillDescription, setSkillDescription] = useState("");
  const [skillPrompt, setSkillPrompt] = useState("");

  const skills = useMemo(() => [...customSkills, ...BUILT_IN_SKILLS], [customSkills]);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleSkills = useMemo(
    () => skills.filter((skill) =>
      !normalizedQuery || `${skill.name} ${skill.description} ${skill.capability}`.toLowerCase().includes(normalizedQuery),
    ),
    [normalizedQuery, skills],
  );
  const visibleConnectors = useMemo(
    () => CONNECTOR_CATALOG.filter((connector) => {
      const matchesQuery = !normalizedQuery || `${getConnectorName(connector)} ${CONNECTOR_DESCRIPTIONS[connector.id] || ""} ${connector.kind}`.toLowerCase().includes(normalizedQuery);
      const isConnected = connector.id === "github" ? githubAccounts.length > 0 : savedAccounts.some((account) => account.connector === connector.id);
      return matchesQuery && (!connectedOnly || isConnected);
    }),
    [connectedOnly, githubAccounts.length, normalizedQuery, savedAccounts],
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
    const sync = () => setSavedAccounts(readSavedAccounts());
    window.addEventListener("storage", sync);
    window.addEventListener("enosx:connector-accounts-updated", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("enosx:connector-accounts-updated", sync);
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

  const copySkillPrompt = async (skill: PluginDefinition) => {
    try {
      await navigator.clipboard.writeText(skill.prompt);
      setCopiedName(skill.name);
      toast.success(`${skill.name} prompt copied`);
      window.setTimeout(() => setCopiedName(null), 1600);
    } catch {
      showError("Clipboard access is unavailable");
    }
  };

  const connectConnector = async (connector: ConnectorCatalogItem) => {
    if (connecting) return;
    if (connector.id === "github") {
      setConnecting(connector.id);
      try {
        const connected = await connectWithOAuth();
        if (connected) toast.success("GitHub connected");
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
        toast.success(`${getConnectorName(connector)} connected`);
      }
      finish();
    };
    window.addEventListener("message", onMessage);
    const closePoll = window.setInterval(() => { if (popup.closed) finish(); }, 500);
    const timeout = window.setTimeout(finish, 180_000);
  };

  const disconnectConnector = (connector: ConnectorCatalogItem) => {
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

  const addCustomSkill = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const name = skillName.trim();
    const prompt = skillPrompt.trim();
    if (!name || !prompt) return;
    const skill: PluginDefinition = {
      name,
      description: skillDescription.trim() || "A custom prompt-based skill.",
      capability: "Custom skill",
      prompt,
      custom: true,
    };
    const next = [skill, ...customSkills];
    localStorage.setItem(CUSTOM_SKILLS_KEY, JSON.stringify(next));
    setCustomSkills(next);
    setSkillName("");
    setSkillDescription("");
    setSkillPrompt("");
    setShowSkillForm(false);
    setShowAddMenu(false);
    setActiveTab("Skills");
    toast.success("Custom skill added");
  };

  const connectedName = (connector: ConnectorCatalogItem) => connector.id === "github"
    ? githubAccounts[0]?.username
    : savedAccounts.find((account) => account.connector === connector.id)?.username
      || savedAccounts.find((account) => account.connector === connector.id)?.email
      || savedAccounts.find((account) => account.connector === connector.id)?.name;

  const connectorIsConnected = (connector: ConnectorCatalogItem) => connector.id === "github"
    ? githubAccounts.length > 0
    : savedAccounts.some((account) => account.connector === connector.id);

  const sectionHeader = (title: string, count?: number, action?: () => void) => (
    <div className="mb-2 flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-semibold text-white/90">
        {title}{typeof count === "number" && <span className="ml-2 text-[11px] font-normal text-white/35">{count}</span>}
      </h3>
      {action && <button type="button" onClick={action} className="inline-flex items-center gap-1 text-xs text-white/65 transition hover:text-white">Show all <ExternalLink size={12} /></button>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plugins-title"
        className="relative flex max-h-[min(860px,calc(100dvh-24px))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-[#171717] text-white shadow-2xl sm:max-h-[min(860px,calc(100dvh-48px))]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-7 sm:py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80"><Puzzle size={18} /></span>
            <div>
              <h2 id="plugins-title" className="font-serif text-[24px] leading-none tracking-tight">Plugins</h2>
              <p className="mt-1 text-[11px] text-white/40">Connect services and keep useful skills close.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close plugins" className="rounded-lg p-2 text-white/45 transition hover:bg-white/[0.08] hover:text-white"><X size={18} /></button>
        </header>

        <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:px-7">
          <label className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-white/[0.05] bg-[#242424] px-3.5 py-2.5 focus-within:border-white/20">
            <Search size={15} className="shrink-0 text-white/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search plugins, connectors, and skills"
              aria-label="Search plugins"
              className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-white/35"
            />
            {query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-white/40 hover:text-white"><X size={14} /></button>}
          </label>

          <div className="flex items-center gap-2">
            <div className="flex rounded-xl bg-[#242424] p-0.5" role="tablist" aria-label="Plugin categories">
              {(["All", "Connectors", "Skills"] as TabName[]).map((tab) => (
                <button
                  key={tab}
                  id={`plugins-tab-${tab.toLowerCase()}`}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-[9px] px-3 py-1.5 text-xs transition ${activeTab === tab ? "bg-[#393939] text-white shadow-sm" : "text-white/55 hover:text-white"}`}
                >{tab}</button>
              ))}
            </div>
            <div className="relative">
              <button type="button" aria-label="Filter plugins" aria-expanded={showFilter} onClick={() => { setShowFilter((value) => !value); setShowAddMenu(false); }} className={`flex h-9 w-9 items-center justify-center rounded-xl border transition ${connectedOnly ? "border-white/25 bg-white/10 text-white" : "border-transparent text-white/50 hover:bg-white/[0.06] hover:text-white"}`}><Filter size={15} /></button>
              {showFilter && <div className="absolute right-0 top-11 z-10 w-48 rounded-xl border border-white/10 bg-[#222] p-2 shadow-xl">
                <button type="button" onClick={() => setConnectedOnly((value) => !value)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-white/75 hover:bg-white/[0.06]">
                  <span className={`flex h-4 w-4 items-center justify-center rounded border ${connectedOnly ? "border-white/70 bg-white/15" : "border-white/20"}`}>{connectedOnly && <Check size={11} />}</span>Connected only
                </button>
              </div>}
            </div>
            <div className="relative">
              <button type="button" aria-expanded={showAddMenu} onClick={() => { setShowAddMenu((value) => !value); setShowFilter(false); }} className="flex h-9 items-center gap-1.5 rounded-xl bg-white px-3 text-xs font-semibold text-[#171717] transition hover:bg-white/90"><Plus size={14} /> Add <ChevronDown size={13} /></button>
              {showAddMenu && <div className="absolute right-0 top-11 z-10 w-52 rounded-xl border border-white/10 bg-[#222] p-1.5 shadow-xl">
                <button type="button" onClick={() => { setActiveTab("Connectors"); setShowAddMenu(false); }} className="w-full rounded-lg px-3 py-2.5 text-left text-xs text-white/80 hover:bg-white/[0.07]">Browse connectors</button>
                <button type="button" onClick={() => { setShowSkillForm(true); setShowAddMenu(false); }} className="w-full rounded-lg px-3 py-2.5 text-left text-xs text-white/80 hover:bg-white/[0.07]">Create a custom skill</button>
              </div>}
            </div>
          </div>
        </div>

        <main className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
          {(activeTab === "All" || activeTab === "Connectors") && (
            <section className="mb-7">
              {sectionHeader(activeTab === "All" ? "Your plugins" : "Connectors", activeTab === "Connectors" ? visibleConnectors.length : undefined)}
              {activeTab === "All" ? (
                <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.015]">
                  {CONNECTOR_CATALOG.filter((connector) => connectorIsConnected(connector)).length ? (
                    CONNECTOR_CATALOG.filter((connector) => connectorIsConnected(connector)).map((connector, index) => (
                      <div key={connector.id} className={`flex items-center gap-3 px-3 py-3 ${index ? "border-t border-white/[0.06]" : ""}`}>
                        <ConnectorLogo name={connector.name} accent="#d4d4d4" size={30} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2"><span className="text-sm font-medium">{getConnectorName(connector)}</span><Check size={13} className="text-emerald-400" /></div>
                          <p className="mt-0.5 truncate text-[11px] text-white/40">{connectedName(connector) || "Connected on this device"} · Connector</p>
                        </div>
                        <button type="button" onClick={() => setActiveTab("Connectors")} className="rounded-lg px-2.5 py-1.5 text-[11px] text-white/55 hover:bg-white/[0.06] hover:text-white">Manage</button>
                      </div>
                    ))
                  ) : (
                    <div className="flex flex-col items-start gap-2 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div><p className="text-sm text-white/75">No connected services yet</p><p className="mt-1 text-[11px] text-white/40">Connect GitHub, Vercel, Shopify, or Google account identity.</p></div>
                      <button type="button" onClick={() => setActiveTab("Connectors")} className="rounded-lg bg-white/[0.08] px-3 py-2 text-xs text-white/80 hover:bg-white/[0.12]">Browse connectors</button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid gap-x-7 sm:grid-cols-2">
                  {visibleConnectors.map((connector, index) => {
                    const isConnected = connectorIsConnected(connector);
                    const status = oauthStatus[connector.id] || "loading";
                    const statusText = isConnected ? "Connected" : status === "ready" ? "Ready to connect" : status === "needs-setup" ? "Needs server setup" : status === "unavailable" ? "Status unavailable" : "Checking setup…";
                    return (
                      <article key={connector.id} className={`flex min-w-0 items-center gap-3 border-white/[0.08] py-3 ${index > 0 ? "border-t" : ""} ${index > 0 && index % 2 === 0 ? "sm:border-t" : ""}`}>
                        <ConnectorLogo name={connector.name} accent={isConnected ? "#4ade80" : "#c4c4c4"} size={32} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5"><span className="truncate text-sm font-medium">{getConnectorName(connector)}</span><span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-white/40">{connector.kind}</span></div>
                          <p className="mt-0.5 truncate text-[11px] text-white/45">{CONNECTOR_DESCRIPTIONS[connector.id]}</p>
                          <p className={`mt-1 text-[10px] ${isConnected ? "text-emerald-400" : "text-white/35"}`}>{isConnected ? `${connectedName(connector) || "Account connected"} · Connected` : statusText}</p>
                        </div>
                        {isConnected ? (
                          <button type="button" onClick={() => disconnectConnector(connector)} className="shrink-0 rounded-lg px-2.5 py-1.5 text-[10px] text-white/45 hover:bg-white/[0.06] hover:text-white">Disconnect</button>
                        ) : status === "ready" ? (
                          <button type="button" onClick={() => void connectConnector(connector)} disabled={Boolean(connecting)} className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-white/80 transition hover:bg-white/[0.08] disabled:opacity-50">{connecting === connector.id ? "Connecting…" : "Connect"}</button>
                        ) : null}
                      </article>
                    );
                  })}
                  {visibleConnectors.length === 0 && <p className="col-span-full py-8 text-center text-xs text-white/40">No connectors match your search or filter.</p>}
                </div>
              )}
              {activeTab === "All" && <p className="mt-2 text-[10px] text-white/30">ENOSX-supported connectors only. Provider access depends on connection and server setup.</p>}
            </section>
          )}

          {(activeTab === "All" || activeTab === "Skills") && (
            <section>
              {sectionHeader(activeTab === "All" ? "Most used skills" : "Skills", visibleSkills.length, activeTab === "All" ? () => setActiveTab("Skills") : undefined)}
              <div className="grid gap-x-7 sm:grid-cols-2">
                {visibleSkills.map((skill, index) => (
                  <article key={`${skill.name}-${index}`} className={`flex min-w-0 items-start gap-3 border-white/[0.08] py-3.5 ${index > 0 ? "border-t" : ""} ${index > 0 && index % 2 === 0 ? "sm:border-t" : ""}`}>
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.1] bg-white/[0.035] text-white/60"><Puzzle size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5"><h4 className="truncate text-sm font-medium text-white/90">{skill.name}</h4>{skill.custom && <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] text-white/45">Custom</span>}</div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-white/45">{skill.description}</p>
                      <p className="mt-1.5 text-[10px] text-white/35">Skill · {skill.capability}</p>
                    </div>
                    <button type="button" onClick={() => void copySkillPrompt(skill)} className="mt-0.5 shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-[10px] text-white/60 transition hover:bg-white/[0.07] hover:text-white">{copiedName === skill.name ? "Copied" : "Use skill"}</button>
                  </article>
                ))}
                {visibleSkills.length === 0 && <p className="col-span-full py-8 text-center text-xs text-white/40">No skills match your search.</p>}
              </div>
              <p className="mt-2 text-[10px] text-white/30">Skills are prompt templates you can copy into a request; they are not standalone executable integrations.</p>
            </section>
          )}
        </main>
      </section>

      {showSkillForm && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowSkillForm(false)}>
          <form onSubmit={addCustomSkill} onClick={(event) => event.stopPropagation()} className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#202020] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><h3 className="text-base font-semibold">Create a custom skill</h3><button type="button" aria-label="Close custom skill form" onClick={() => setShowSkillForm(false)} className="rounded-lg p-1.5 text-white/45 hover:bg-white/[0.08] hover:text-white"><X size={16} /></button></div>
            <p className="mb-4 text-xs leading-relaxed text-white/45">Save a reusable prompt template on this device. Custom skills are copied into your request when you choose “Use skill.”</p>
            <label className="mb-3 block text-xs text-white/65">Name<input required value={skillName} onChange={(event) => setSkillName(event.target.value)} maxLength={60} placeholder="e.g. Kenya market analyst" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30" /></label>
            <label className="mb-3 block text-xs text-white/65">Description<input value={skillDescription} onChange={(event) => setSkillDescription(event.target.value)} maxLength={140} placeholder="What does this skill help with?" className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30" /></label>
            <label className="block text-xs text-white/65">Prompt<textarea required value={skillPrompt} onChange={(event) => setSkillPrompt(event.target.value)} rows={5} maxLength={4000} placeholder="Write the reusable instructions for this skill..." className="mt-1.5 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-white/30 focus:border-white/30" /></label>
            <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => setShowSkillForm(false)} className="rounded-lg px-3 py-2 text-xs text-white/55 hover:bg-white/[0.06]">Cancel</button><button type="submit" className="rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-[#171717] hover:bg-white/90">Save skill</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
