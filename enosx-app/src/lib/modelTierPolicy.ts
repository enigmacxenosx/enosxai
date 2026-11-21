import type { AIMode } from "@/components/CommandBar";

export type ModelTierAction =
  | "everyday_chat"
  | "summarize_translate"
  | "creative_drafting"
  | "coding_debugging"
  | "document_analysis"
  | "image_understanding"
  | "research"
  | "github_work"
  | "architecture_strategy"
  | "complex_science_math"
  | "high_stakes_decision";

export type ModelTierRecommendation = {
  action: ModelTierAction;
  mode: AIMode;
  label: string;
  reason: string;
};

/**
 * Product guidance only: this recommends a user-facing tier, but does not
 * silently change the user's selected mode or claim that a tier guarantees
 * correctness. Keep this mapping separate from provider model IDs.
 */
export const MODEL_TIER_RECOMMENDATIONS: ReadonlyArray<ModelTierRecommendation> = [
  { action: "everyday_chat", mode: "ex-core", label: "ENOSX One", reason: "Fast everyday questions and simple assistance." },
  { action: "summarize_translate", mode: "ex-core", label: "ENOSX One", reason: "Summaries, rewrites, and translations where speed matters." },
  { action: "creative_drafting", mode: "ex-core", label: "ENOSX One", reason: "Brainstorming, drafting, and ordinary content generation." },
  { action: "coding_debugging", mode: "ex-pro", label: "ENOSX Studio", reason: "Code generation, debugging, and technical implementation." },
  { action: "document_analysis", mode: "ex-pro", label: "ENOSX Studio", reason: "Longer document review and structured explanation." },
  { action: "image_understanding", mode: "ex-pro", label: "ENOSX Studio", reason: "Visual analysis; ENOSX Nexus is text-only." },
  { action: "research", mode: "ex-pro", label: "ENOSX Studio", reason: "Source-based research and evidence comparison." },
  { action: "github_work", mode: "ex-pro", label: "ENOSX Studio", reason: "Repository, CI, code-review, and implementation work." },
  { action: "architecture_strategy", mode: "enosh-mind", label: "ENOSX Nexus", reason: "Architecture, strategy, trade-offs, and multi-step planning." },
  { action: "complex_science_math", mode: "enosh-mind", label: "ENOSX Nexus", reason: "Difficult quantitative, scientific, and engineering analysis." },
  { action: "high_stakes_decision", mode: "enosh-mind", label: "ENOSX Nexus", reason: "Risk-heavy decisions that need deliberate scenario analysis." },
];

export function getModelTierRecommendation(action: ModelTierAction) {
  return MODEL_TIER_RECOMMENDATIONS.find((recommendation) => recommendation.action === action);
}

type PromptTierSignals = {
  hasAttachments?: boolean;
  hasImageAttachment?: boolean;
};

/**
 * Infer only high-confidence categories. Returning null for ordinary prompts
 * avoids noisy notifications and leaves the user's selected tier untouched.
 */
export function recommendModelTierForPrompt(prompt: string, signals: PromptTierSignals = {}) {
  const text = prompt.toLocaleLowerCase();
  const match = (pattern: RegExp) => pattern.test(text);

  if (signals.hasImageAttachment || match(/\b(?:image|photo|picture|screenshot|visual|diagram)\b/)) {
    return getModelTierRecommendation("image_understanding");
  }
  if (match(/\b(?:architecture|system design|trade[- ]?offs?|strategy|strategic|roadmap|business plan|scenario analysis)\b/)) {
    return getModelTierRecommendation("architecture_strategy");
  }
  if (match(/\b(?:equation|derive|proof|theorem|calculus|physics|chemistry|circuit|thermodynamic|engineering calculation|quantitative analysis)\b/)) {
    return getModelTierRecommendation("complex_science_math");
  }
  if (match(/\b(?:risk assessment|high[- ]stakes|compliance decision|investment decision|medical decision|legal decision)\b/)) {
    return getModelTierRecommendation("high_stakes_decision");
  }
  if (match(/\b(?:github|repository|repo|pull request|code review|ci\/cd|workflow|debug|debugging|implement|typescript|javascript|python|api)\b/)) {
    return getModelTierRecommendation("github_work");
  }
  if (signals.hasAttachments || match(/\b(?:research|sources?|compare evidence|analy[sz]e|analy[sz]is|document|pdf|report)\b/)) {
    return getModelTierRecommendation("document_analysis");
  }

  return undefined;
}
