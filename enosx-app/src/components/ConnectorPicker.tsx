import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Cable, Check, Search, SlidersHorizontal, X } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { CONNECTOR_CATALOG, ConnectorKind } from "@/lib/connectorCatalog";
import ConnectorLogo from "./ConnectorLogo";

interface ConnectorPickerProps {
  selectedConnectorIds: string[];
  onToggleConnector: (connectorId: string) => void;
}

const KIND_FILTERS: Array<"All" | ConnectorKind> = [
  "All",
  "Built-in",
  "MCP",
  "API",
];

function kindColor(kind: ConnectorKind) {
  if (kind === "Built-in") return "#4ade80";
  if (kind === "API") return "#fbbf24";
  return "#a78bfa";
}

export default function ConnectorPicker({
  selectedConnectorIds,
  onToggleConnector,
}: ConnectorPickerProps) {
  const { config } = useTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] =
    useState<(typeof KIND_FILTERS)[number]>("All");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [open]);

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  const filteredConnectors = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return CONNECTOR_CATALOG.filter((connector) => {
      const matchesQuery =
        !normalizedQuery ||
        connector.name.toLowerCase().includes(normalizedQuery);
      const matchesKind = kindFilter === "All" || connector.kind === kindFilter;
      return matchesQuery && matchesKind;
    });
  }, [kindFilter, query]);

  const selectedCount = selectedConnectorIds.length;

  return (
    <div className="relative" ref={containerRef}>
      <motion.button
        type="button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold text-xs whitespace-nowrap transition-all"
        style={{
          background:
            selectedCount > 0
              ? `rgba(${config.accentRgb}, 0.16)`
              : "rgba(255,255,255,0.05)",
          border:
            selectedCount > 0
              ? `1.5px solid ${config.accent}`
              : "1px solid rgba(255,255,255,0.1)",
          color: selectedCount > 0 ? config.accent : config.textMuted,
          boxShadow:
            selectedCount > 0
              ? `0 0 10px rgba(${config.accentRgb}, 0.18)`
              : "none",
        }}
        title="Choose connectors for this chat"
      >
        <Cable size={13} />
        Connectors
        {selectedCount > 0 && (
          <span
            className="min-w-4 h-4 px-1 rounded-full flex items-center justify-center text-[10px]"
            style={{
              background: `rgba(${config.accentRgb}, 0.25)`,
              color: config.accent,
            }}
          >
            {selectedCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            role="dialog"
            aria-label="Connector picker"
            className="absolute bottom-full left-0 mb-2 z-[60] overflow-hidden rounded-2xl"
            style={{
              width: "min(420px, calc(100vw - 32px))",
              background: "rgba(12,12,18,0.98)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(18px)",
              WebkitBackdropFilter: "blur(18px)",
              boxShadow: "0 18px 50px rgba(0,0,0,0.58)",
            }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-white/[0.08]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div
                    className="flex items-center gap-2 text-sm font-semibold"
                    style={{ color: config.text }}
                  >
                    <Cable size={15} style={{ color: config.accent }} />
                    Connectors
                    <span className="text-[10px] font-medium text-white/40">
                      100 available
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/45">
                    Select services to make them part of the next prompt
                    context.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-white/45 hover:text-white hover:bg-white/[0.06] transition-colors"
                  aria-label="Close connector picker"
                >
                  <X size={14} />
                </button>
              </div>

              <div
                className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: "rgba(255,255,255,0.055)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <Search size={14} className="shrink-0 text-white/40" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search connectors..."
                  className="min-w-0 flex-1 bg-transparent outline-none text-xs text-white placeholder:text-white/35"
                  aria-label="Search connectors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="text-white/35 hover:text-white transition-colors"
                    aria-label="Clear connector search"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>

              <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <SlidersHorizontal
                  size={12}
                  className="shrink-0 text-white/35"
                />
                {KIND_FILTERS.map((filter) => {
                  const active = filter === kindFilter;
                  return (
                    <button
                      type="button"
                      key={filter}
                      onClick={() => setKindFilter(filter)}
                      className="px-2.5 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap transition-colors"
                      style={{
                        background: active
                          ? `rgba(${config.accentRgb}, 0.17)`
                          : "rgba(255,255,255,0.04)",
                        border: active
                          ? `1px solid rgba(${config.accentRgb}, 0.38)`
                          : "1px solid rgba(255,255,255,0.07)",
                        color: active ? config.accent : "rgba(255,255,255,0.5)",
                      }}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

            <div
              className="max-h-64 overflow-y-auto p-2"
              role="listbox"
              aria-label="Available connectors"
              aria-multiselectable="true"
            >
              {filteredConnectors.length === 0 ? (
                <div className="px-3 py-8 text-center text-xs text-white/45">
                  No connectors match this search.
                </div>
              ) : (
                filteredConnectors.map((connector) => {
                  const selected = selectedConnectorIds.includes(connector.id);
                  const accent = kindColor(connector.kind);
                  return (
                    <button
                      type="button"
                      key={connector.id}
                      role="option"
                      aria-selected={selected}
                      onClick={() => onToggleConnector(connector.id)}
                      className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/[0.06]"
                      style={{
                        background: selected
                          ? "rgba(255,255,255,0.075)"
                          : "transparent",
                      }}
                    >
                      <ConnectorLogo name={connector.name} accent={accent} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-white/85">
                          {connector.name}
                        </span>
                        <span
                          className="block mt-0.5 text-[10px]"
                          style={{ color: accent }}
                        >
                          {connector.kind}
                        </span>
                      </span>
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={
                          selected
                            ? {
                                background: `rgba(${config.accentRgb}, 0.22)`,
                                color: config.accent,
                              }
                            : { color: "rgba(255,255,255,0.18)" }
                        }
                      >
                        {selected && <Check size={13} />}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-white/[0.08] px-4 py-3 text-[10px] text-white/40">
              <span>{filteredConnectors.length} shown</span>
              <span>
                {selectedCount
                  ? `${selectedCount} selected for this chat`
                  : "Nothing selected"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
