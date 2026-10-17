import { useEffect, useState } from "react";
import { Activity, ArrowDown, ArrowUp, FileImage, MessageCircle, MessagesSquare, Mic, Settings2, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export interface MonitoringSnapshot {
  totalMessages: number;
  totalConversations: number;
  voiceUsageCount: number;
  isListening: boolean;
  isProcessing: boolean;
  filesInContext: number;
}

type WidgetId = "runtime" | "messages" | "conversations" | "voice" | "files";
type DashboardLayout = { visible: WidgetId[]; order: WidgetId[] };

const WIDGETS: Array<{ id: WidgetId; label: string; icon: LucideIcon }> = [
  { id: "runtime", label: "Assistant status", icon: Activity },
  { id: "messages", label: "Messages", icon: MessagesSquare },
  { id: "conversations", label: "Conversations", icon: MessageCircle },
  { id: "voice", label: "Voice sessions", icon: Mic },
  { id: "files", label: "Files in context", icon: FileImage },
];
const DEFAULT_LAYOUT: DashboardLayout = { visible: WIDGETS.map(({ id }) => id), order: WIDGETS.map(({ id }) => id) };
const STORAGE_KEY = "enosx-monitoring-dashboard-v1";

function loadLayout(): DashboardLayout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<DashboardLayout>;
    const validIds = new Set(WIDGETS.map(({ id }) => id));
    const order = Array.isArray(parsed.order) ? parsed.order.filter((id): id is WidgetId => validIds.has(id as WidgetId)) : [];
    const normalizedOrder = [...new Set([...order, ...DEFAULT_LAYOUT.order])];
    const visible = Array.isArray(parsed.visible) ? [...new Set(parsed.visible.filter((id): id is WidgetId => validIds.has(id as WidgetId)))] : DEFAULT_LAYOUT.visible;
    return { visible: visible.length ? visible : ["runtime"], order: normalizedOrder };
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export default function MonitoringDashboard({ snapshot }: { snapshot?: MonitoringSnapshot }) {
  const { config } = useTheme();
  const [layout, setLayout] = useState<DashboardLayout>(loadLayout);
  const [isCustomizing, setIsCustomizing] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)); } catch { /* Storage may be disabled. */ }
  }, [layout]);

  const metrics = {
    runtime: {
      value: snapshot?.isListening ? "Listening" : snapshot?.isProcessing ? "Working" : "Ready",
      caption: snapshot?.isListening ? "Microphone active" : snapshot?.isProcessing ? "Request in progress" : "Systems available",
    },
    messages: { value: (snapshot?.totalMessages ?? 0).toLocaleString(), caption: "Across your chats" },
    conversations: { value: (snapshot?.totalConversations ?? 0).toLocaleString(), caption: "In chat history" },
    voice: { value: (snapshot?.voiceUsageCount ?? 0).toLocaleString(), caption: snapshot?.isListening ? "Live voice session" : "Voice sessions" },
    files: { value: (snapshot?.filesInContext ?? 0).toLocaleString(), caption: "Available to ENOSX" },
  } satisfies Record<WidgetId, { value: string; caption: string }>;

  const moveWidget = (id: WidgetId, direction: -1 | 1) => {
    setLayout((current) => {
      const index = current.order.indexOf(id);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.order.length) return current;
      const order = [...current.order];
      [order[index], order[target]] = [order[target], order[index]];
      return { ...current, order };
    });
  };

  const toggleWidget = (id: WidgetId) => {
    setLayout((current) => {
      const visible = current.visible.includes(id)
        ? current.visible.filter((item) => item !== id)
        : [...current.visible, id];
      return { ...current, visible: visible.length ? visible : [id] };
    });
  };

  const widgets = layout.order
    .filter((id) => layout.visible.includes(id))
    .map((id) => ({ ...WIDGETS.find((widget) => widget.id === id)!, ...metrics[id] }));

  return (
    <section aria-label="Live monitoring dashboard" className="w-full rounded-2xl border p-4 sm:p-5" style={{ borderColor: `rgba(${config.accentRgb},0.18)`, background: "rgba(8,10,16,0.5)" }}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Activity size={16} style={{ color: config.accent }} aria-hidden="true" />
          <h3 className="text-sm font-semibold" style={{ color: config.text }}>Live monitoring</h3>
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/5 px-2 py-0.5 text-[10px] font-medium text-emerald-200/80"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />LIVE</span>
        </div>
        <button type="button" onClick={() => setIsCustomizing((open) => !open)} aria-label="Customize monitoring widgets" aria-expanded={isCustomizing} className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition hover:bg-white/10" style={{ borderColor: `rgba(${config.accentRgb},0.2)`, color: config.textMuted }}>
          {isCustomizing ? <X size={13} /> : <Settings2 size={13} />}
          <span>{isCustomizing ? "Done" : "Customize"}</span>
        </button>
      </div>

      {isCustomizing && (
        <div className="mb-3 grid gap-2 rounded-xl border p-3 sm:grid-cols-2" style={{ borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.025)" }}>
          {WIDGETS.map((widget) => {
            const Icon = widget.icon;
            const index = layout.order.indexOf(widget.id);
            return (
              <div key={widget.id} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5">
                <label className="flex min-w-0 items-center gap-2 text-xs" style={{ color: config.text }}>
                  <input type="checkbox" checked={layout.visible.includes(widget.id)} onChange={() => toggleWidget(widget.id)} aria-label={widget.label} className="accent-violet-400" />
                  <Icon size={14} aria-hidden="true" />
                  <span className="truncate">{widget.label}</span>
                </label>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => moveWidget(widget.id, -1)} disabled={index === 0} aria-label={`Move ${widget.label} up`} className="rounded p-1 text-white/60 hover:bg-white/10 disabled:opacity-25"><ArrowUp size={13} /></button>
                  <button type="button" onClick={() => moveWidget(widget.id, 1)} disabled={index === WIDGETS.length - 1} aria-label={`Move ${widget.label} down`} className="rounded p-1 text-white/60 hover:bg-white/10 disabled:opacity-25"><ArrowDown size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {widgets.map(({ id, label, icon: Icon, value, caption }) => (
          <article key={id} data-testid={`monitoring-widget-${id}`} className="min-w-0 rounded-xl border p-3 text-left" style={{ borderColor: "rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.035)" }}>
            <div className="mb-2 flex items-center gap-2 text-[11px] font-medium" style={{ color: config.textMuted }}><Icon size={14} style={{ color: config.accent }} aria-hidden="true" /><span className="truncate">{label}</span></div>
            <div className="truncate text-lg font-semibold leading-tight" style={{ color: config.text }}>{value}</div>
            <div className="mt-1 truncate text-[10px]" style={{ color: config.textMuted }}>{caption}</div>
          </article>
        ))}
      </div>
      <p className="sr-only" aria-live="polite">Assistant status: {metrics.runtime.value}. {metrics.messages.value} messages, {metrics.conversations.value} conversations, {metrics.files.value} files in context.</p>
    </section>
  );
}
