import { Copy, Sparkles, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

interface ReusableFeaturesDialogProps {
  open: boolean;
  onClose: () => void;
}

const TEMPLATES = [
  {
    name: "Research to Brief",
    description: "Turn a topic into a structured, source-aware brief.",
    prompt: "Research this topic, compare the strongest available sources, extract the key findings, separate facts from inferences, and produce a concise decision-ready brief with next steps.",
  },
  {
    name: "Repository to Plan",
    description: "Understand a codebase and turn it into an implementation plan.",
    prompt: "Inspect the relevant repository context, explain the current architecture, identify the files that matter, and create a prioritized implementation plan with risks, tests, and a clear first step.",
  },
  {
    name: "File to Action",
    description: "Extract decisions and next actions from an uploaded file.",
    prompt: "Analyze the attached file, summarize what matters, identify decisions, risks, unanswered questions, and convert the findings into a practical action list.",
  },
  {
    name: "Voice Note to Plan",
    description: "Turn an unstructured idea into a clear plan.",
    prompt: "Turn this idea into a focused plan. Clarify the objective, assumptions, milestones, dependencies, risks, and the smallest useful next action.",
  },
  {
    name: "Prompt to Creative",
    description: "Develop a creative concept into a usable visual brief.",
    prompt: "Develop this creative idea into a polished visual brief with audience, message, composition, mood, color direction, text guidance, and three useful variations.",
  },
];

export default function ReusableFeaturesDialog({ open, onClose }: ReusableFeaturesDialogProps) {
  const { config } = useTheme();
  const [copiedName, setCopiedName] = useState<string | null>(null);

  if (!open) return null;

  const copyTemplate = async (name: string, prompt: string) => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopiedName(name);
      toast.success(`${name} prompt copied`);
      window.setTimeout(() => setCopiedName(null), 1600);
    } catch {
      toast.error("Clipboard access is unavailable");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reusable-features-title"
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
              <Sparkles size={16} />
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">Reusable feature</span>
            </div>
            <h2 id="reusable-features-title" className="text-xl font-bold text-white">Reusable Workflows</h2>
            <p className="mt-1 text-sm text-white/55">Copy a ready-made workflow prompt and reuse it in any Enosx AI conversation.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close reusable workflows" className="rounded-lg p-2 text-white/50 transition hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {TEMPLATES.map((template) => (
            <article key={template.name} className="rounded-xl border border-white/10 bg-white/[0.035] p-4 transition hover:border-white/20 hover:bg-white/[0.06]">
              <h3 className="text-sm font-semibold text-white">{template.name}</h3>
              <p className="mt-1 min-h-10 text-xs leading-relaxed text-white/50">{template.description}</p>
              <button
                type="button"
                onClick={() => copyTemplate(template.name, template.prompt)}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:bg-white/10"
                style={{ borderColor: `rgba(${config.accentRgb}, 0.3)`, color: config.accent }}
              >
                <Copy size={13} />
                {copiedName === template.name ? "Copied" : "Copy workflow"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
