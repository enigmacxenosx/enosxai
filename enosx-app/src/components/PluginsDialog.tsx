import { Copy, Download, PlugZap, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { showError } from "@/lib/errorReporting";
import { useTheme } from "@/contexts/ThemeContext";

interface PluginsDialogProps {
  open: boolean;
  onClose: () => void;
}

type PluginDefinition = {
  name: string;
  description: string;
  capability: string;
  prompt: string;
};

const PLUGINS: PluginDefinition[] = [
  {
    name: "Research Plugin",
    description: "Turn a topic into a structured, source-aware brief.",
    capability: "Research and synthesis",
    prompt: "Research this topic, compare the strongest available sources, extract the key findings, separate facts from inferences, and produce a concise decision-ready brief with next steps.",
  },
  {
    name: "Repository Plugin",
    description: "Understand a codebase and turn it into an implementation plan.",
    capability: "Codebase analysis",
    prompt: "Inspect the relevant repository context, explain the current architecture, identify the files that matter, and create a prioritized implementation plan with risks, tests, and a clear first step.",
  },
  {
    name: "File Analysis Plugin",
    description: "Extract decisions and next actions from an uploaded file.",
    capability: "Document intelligence",
    prompt: "Analyze the attached file, summarize what matters, identify decisions, risks, unanswered questions, and convert the findings into a practical action list.",
  },
  {
    name: "Planning Plugin",
    description: "Turn an unstructured idea into a clear, achievable plan.",
    capability: "Planning and prioritization",
    prompt: "Turn this idea into a focused plan. Clarify the objective, assumptions, milestones, dependencies, risks, and the smallest useful next action.",
  },
  {
    name: "Creative Brief Plugin",
    description: "Develop a creative concept into a usable visual brief.",
    capability: "Creative direction",
    prompt: "Develop this creative idea into a polished visual brief with audience, message, composition, mood, color direction, text guidance, and three useful variations.",
  },
  {
    name: "Visual Story Plugin",
    description: "Turn metrics or research findings into a narrated visual sequence.",
    capability: "Data storytelling",
    prompt: "Turn this data into a presentation-ready visual story. Establish the baseline, identify the turning point, and explain the outcome. For each scene, provide a title, narration, recommended visual, exact data emphasis, and restrained animation direction. Do not invent values; label assumptions and include a reduced-motion alternative.",
  },
];

export default function PluginsDialog({ open, onClose }: PluginsDialogProps) {
  const { config } = useTheme();
  const [copiedName, setCopiedName] = useState<string | null>(null);

  if (!open) return null;

  const copyPluginPrompt = async (plugin: PluginDefinition) => {
    try {
      await navigator.clipboard.writeText(plugin.prompt);
      setCopiedName(plugin.name);
      toast.success(`${plugin.name} prompt copied`);
      window.setTimeout(() => setCopiedName(null), 1600);
    } catch {
      showError("Clipboard access is unavailable");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="plugins-title"
        className="w-full max-w-2xl max-h-[min(720px,calc(100vh-2rem))] overflow-y-auto rounded-2xl border p-5 shadow-2xl"
        style={{
          background: "rgba(10, 12, 20, 0.96)",
          borderColor: `rgba(${config.accentRgb}, 0.28)`,
          boxShadow: `0 0 50px rgba(${config.accentRgb}, 0.16)`,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="mb-1 flex items-center gap-2" style={{ color: config.accent }}>
              <PlugZap size={16} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Plugin library</span>
            </div>
            <h2 id="plugins-title" className="text-xl font-bold text-white">Plugins</h2>
            <p className="mt-1 text-sm text-white/55">Add a focused capability to your next ENOSX AI request.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close plugins" className="rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {PLUGINS.map((plugin) => (
            <article key={plugin.name} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/20 hover:bg-white/[0.06]">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold text-white">{plugin.name}</h3>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">{plugin.capability}</span>
              </div>
              <p className="mt-2 min-h-10 text-xs leading-relaxed text-white/50">{plugin.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copyPluginPrompt(plugin)}
                  className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/10"
                  style={{ borderColor: `rgba(${config.accentRgb}, 0.3)`, color: config.accent }}
                >
                  <Copy size={13} />
                  {copiedName === plugin.name ? "Copied" : "Copy prompt"}
                </button>
                <span className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-[11px] text-white/35">
                  <Download size={12} /> Ready to use
                </span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
