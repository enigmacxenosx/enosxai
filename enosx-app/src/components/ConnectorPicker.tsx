import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ExternalLink, Github, Search, SlidersHorizontal, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CONNECTOR_CATALOG, CONNECTOR_COUNT, ConnectorKind } from "@/lib/connectorCatalog";
import ConnectorLogo from "./ConnectorLogo";

interface ConnectorPickerProps {
  selectedConnectorIds: string[];
  onToggleConnector: (connectorId: string) => void;
}

const KIND_FILTERS: Array<"All" | ConnectorKind> = ["All", "Built-in", "MCP", "API"];
const GITHUB_REPOSITORIES = ["enosxai", "enosxtechsite", "enigmacxenosx", "enosx-ecosystem", "e-commerce", "enosh-blog", "Exboot", "ENOSH-BROWSER"];

function kindColor(kind: ConnectorKind) {
  if (kind === "Built-in") return "#4ade80";
  if (kind === "API") return "#fbbf24";
  return "#a78bfa";
}

export default function ConnectorPicker({ selectedConnectorIds, onToggleConnector }: ConnectorPickerProps) {
  const { config } = useTheme();
  const [open, setOpen] = useState(false);
  const [activeConnector, setActiveConnector] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<(typeof KIND_FILTERS)[number]>("All");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const filteredConnectors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return CONNECTOR_CATALOG.filter((connector) =>
      (!normalizedQuery || connector.name.toLowerCase().includes(normalizedQuery)) &&
      (kindFilter === "All" || connector.kind === kindFilter),
    );
  }, [kindFilter, query]);

  const selectedCount = selectedConnectorIds.length;
  const githubOpen = activeConnector === "github";

  return (
    <div className="relative" ref={containerRef}>
      <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setOpen((current) => !current)} aria-expanded={open} aria-haspopup="dialog" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all" style={{ background: selectedCount > 0 ? `rgba(${config.accentRgb}, 0.16)` : "rgba(255,255,255,0.05)", border: selectedCount > 0 ? `1.5px solid ${config.accent}` : "1px solid rgba(255,255,255,0.1)", color: selectedCount > 0 ? config.accent : config.textMuted }}>
        <span className="text-[15px] leading-none">+</span> Connectors
        {selectedCount > 0 && <span className="min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px]" style={{ background: `rgba(${config.accentRgb}, 0.25)`, color: config.accent }}>{selectedCount}</span>}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.97 }} transition={{ duration: 0.18 }} role="dialog" aria-label="Connector picker" className="absolute bottom-full left-0 mb-2 z-[60] flex overflow-visible rounded-xl" style={{ width: githubOpen ? "min(630px, calc(100vw - 32px))" : "min(420px, calc(100vw - 32px))", background: "#202020", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 18px 50px rgba(0,0,0,0.58)" }}>
            <div className="w-full overflow-hidden rounded-xl">
              <div className="px-4 pt-4 pb-3 border-b border-white/[0.08]">
                <div className="flex items-start justify-between gap-3">
                  <div><div className="flex items-center gap-2 text-sm font-semibold" style={{ color: config.text }}>Connectors <span className="text-[10px] font-medium text-white/40">{CONNECTOR_COUNT} available</span></div><p className="mt-1 text-[11px] leading-relaxed text-white/45">Connect services to use them in your next prompt.</p></div>
                  <button type="button" onClick={() => setOpen(false)} className="w-7 h-7 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06]" aria-label="Close connector picker"><X size={14} /></button>
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 bg-white/[0.05] border border-white/[0.08]"><Search size={14} className="shrink-0 text-white/40" /><input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search connectors..." className="min-w-0 flex-1 bg-transparent outline-none text-xs text-white placeholder:text-white/35" aria-label="Search connectors" /></div>
                <div className="mt-3 flex items-center gap-1.5 overflow-x-auto"><SlidersHorizontal size={12} className="shrink-0 text-white/35" />{KIND_FILTERS.map((filter) => <button type="button" key={filter} onClick={() => setKindFilter(filter)} className="px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap" style={{ background: filter === kindFilter ? `rgba(${config.accentRgb}, 0.17)` : "rgba(255,255,255,0.04)", border: `1px solid ${filter === kindFilter ? `rgba(${config.accentRgb}, 0.38)` : "rgba(255,255,255,0.07)"}`, color: filter === kindFilter ? config.accent : "rgba(255,255,255,0.5)" }}>{filter}</button>)}</div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2" role="listbox" aria-label="Available connectors" aria-multiselectable="true">
                {filteredConnectors.map((connector) => { const selected = selectedConnectorIds.includes(connector.id); const accent = kindColor(connector.kind); return <button type="button" key={connector.id} role="option" aria-selected={selected} onClick={() => connector.id === "github" ? setActiveConnector("github") : onToggleConnector(connector.id)} className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-white/[0.07]" style={{ background: activeConnector === connector.id || selected ? "rgba(255,255,255,0.08)" : "transparent" }}><ConnectorLogo name={connector.name} accent={accent} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-medium text-white/85">{connector.name}</span><span className="block mt-0.5 text-[10px]" style={{ color: accent }}>{connector.kind}</span></span>{connector.id !== "github" && <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ color: selected ? config.accent : "rgba(255,255,255,0.18)" }}>{selected && <Check size={13} />}</span>}</button>; })}
              </div>
              <div className="flex items-center justify-between border-t border-white/[0.08] px-4 py-3 text-[10px] text-white/40"><span>{filteredConnectors.length} shown</span><span>{selectedCount ? `${selectedCount} selected for this chat` : "Nothing selected"}</span></div>
            </div>

            <AnimatePresence>
              {githubOpen && <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} className="absolute left-full top-0 ml-1 w-[250px] overflow-hidden rounded-xl border border-white/[0.12] bg-[#202020] shadow-2xl">
                <div className="flex items-center justify-between border-b border-white/[0.08] px-3 py-3"><div className="flex items-center gap-2 text-sm text-white/85"><Github size={15} /> GitHub</div><button type="button" onClick={() => onToggleConnector("github")} aria-label="Toggle GitHub" className="h-5 w-7 rounded-full p-0.5" style={{ background: selectedConnectorIds.includes("github") ? "#5b8cff" : "#555" }}><span className={`block h-4 w-4 rounded-full bg-white transition-transform ${selectedConnectorIds.includes("github") ? "translate-x-2" : "translate-x-0"}`} /></button></div>
                <div className="border-b border-white/[0.08] px-3 py-3"><div className="flex items-center gap-2 text-xs text-white/55"><Search size={14} />Search repositories</div></div>
                <div className="max-h-64 overflow-y-auto py-1">{GITHUB_REPOSITORIES.map((repo) => <button type="button" key={repo} onClick={() => onToggleConnector("github")} className="flex w-full items-center gap-3 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/[0.07]"><span className="h-3.5 w-3.5 rounded-sm border border-white/45" />{repo}{repo === "enosxai" && <Check size={14} className="ml-auto text-white/75" />}</button>)}</div>
                <button type="button" onClick={() => window.open("https://github.com/settings/connections/applications", "_blank", "noopener,noreferrer")} className="flex w-full items-center gap-2 border-t border-white/[0.08] px-3 py-3 text-xs text-white/80 hover:bg-white/[0.07]"><Github size={14} />Configure GitHub <ExternalLink size={13} className="ml-auto text-white/45" /></button>
              </motion.div>}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
