/*
 * ENOSX AI — suggestions
 * Lightweight, fully client-side text suggestion engine that produces
 * quick-answer prompt chips based on what the user is currently typing.
 *
 * Data lives in a curated prompt library (including the FAQ topics) plus any
 * user-uploaded knowledge entries, so suggestions stay private and offline.
 */

import { FAQ_TOPICS } from "@/lib/faqTopics";
import type { KnowledgeEntry } from "@/hooks/useKnowledgeBank";

export interface Suggestion {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

interface SuggestionSource {
  title: string;
  keywords: string[];
  prompt: string;
  icon?: string;
}

const LIBRARY: SuggestionSource[] = [
  ...FAQ_TOPICS.map((t) => ({
    title: t.label,
    keywords: t.label.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
    prompt: t.prompt,
    icon: t.icon,
  })),
  {
    title: "What can you do?",
    keywords: ["can", "do", "help", "you", "capabilities", "features"],
    prompt: "What are your main capabilities and what can you help me with?",
    icon: "✨",
  },
  {
    title: "Who made you?",
    keywords: ["who", "made", "created", "built", "your", "creator", "founder", "about", "enosx"],
    prompt: "Who is Enosh Yeswa and what is Enosx Technologies?",
    icon: "👤",
  },
  {
    title: "Write code",
    keywords: ["code", "coding", "program", "function", "script", "bug", "fix", "debug", "javascript", "python", "react", "typescript"],
    prompt: "Help me write clean, well-documented code for: ",
    icon: "💻",
  },
  {
    title: "Explain something",
    keywords: ["explain", "what", "what is", "whats", "mean", "concept", "how does", "understand"],
    prompt: "Explain this concept simply and clearly: ",
    icon: "🤔",
  },
  {
    title: "Summarize text",
    keywords: ["summar", "tldr", "tl;dr", "short", "brief", "condense", "key points"],
    prompt: "Please summarize this and give me the key points: ",
    icon: "📄",
  },
  {
    title: "Write content",
    keywords: ["write", "email", "essay", "blog", "article", "post", "letter", "draft", "content"],
    prompt: "Help me write: ",
    icon: "✍️",
  },
  {
    title: "Brainstorm ideas",
    keywords: ["idea", "brainstorm", "suggestions", "creative", "name", "generate ideas"],
    prompt: "Give me a brainstorm of ideas for: ",
    icon: "💡",
  },
  {
    title: "Translate",
    keywords: ["translate", "language", "spanish", "french", "german", "swahili", "kiswahili"],
    prompt: "Please translate this into: ",
    icon: "🌐",
  },
  {
    title: "Math problem",
    keywords: ["math", "equation", "calculate", "solve", "geometry", "algebra", "statistics"],
    prompt: "Help me solve this math problem step by step: ",
    icon: "🔢",
  },
  {
    title: "Plan my day",
    keywords: ["plan", "schedule", "agenda", "organise", "organize", "routine", "today", "daily"],
    prompt: "Help me plan my day/routine effectively: ",
    icon: "📅",
  },
];

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1);
}

function score(source: SuggestionSource, terms: string[]): number {
  const title = source.title.toLowerCase();
  let score = 0;
  for (const term of terms) {
    if (source.keywords.includes(term)) score += 3;
    if (title.includes(term)) score += 2;
    for (const kw of source.keywords) {
      if (kw.startsWith(term) || term.startsWith(kw)) score += 1;
    }
  }
  return score;
}

export function getSuggestions(
  value: string,
  knowledge?: KnowledgeEntry[],
  limit = 3,
): Suggestion[] {
  const input = value.trim();
  if (input.length < 2) return [];

  const terms = tokenize(input);
  if (!terms.length) return [];

  const sources: SuggestionSource[] = [...LIBRARY];

  // Add user knowledge entries as potential suggestion sources.
  if (knowledge?.length) {
    sources.push(
      ...knowledge.map((entry) => ({
        title: entry.title,
        keywords: [entry.title, ...entry.tags, entry.kind]
          .join(" ")
          .toLowerCase()
          .split(/[^a-z0-9]+/),
        prompt: entry.title,
        icon: "🧠",
      })),
    );
  }

  const ranked = sources
    .map((source) => ({ source, score: score(source, terms) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return ranked.map(({ source }, index) => ({
    id: `${source.title}-${index}`,
    label: source.title,
    prompt: source.prompt,
    icon: source.icon,
  }));
}