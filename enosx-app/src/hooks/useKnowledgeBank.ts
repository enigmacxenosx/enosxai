import { useCallback, useEffect, useMemo, useState } from "react";

export type KnowledgeKind = "fact" | "instruction" | "document" | "skill" | "project";
export const VECTOR_DIMENSIONS = 96;

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  kind: KnowledgeKind;
  tags: string[];
  source: string;
  vector?: number[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "enosx_knowledge_bank_v1";

function makeId() { return `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function normalize(value: string) { return value.trim().toLowerCase(); }

/** Deterministic, dependency-free local embedding. It is not a neural embedding,
 * but gives the offline bank a real vector index without network/model access. */
export function createLocalVector(text: string): number[] {
  const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0);
  const tokens = normalize(text).split(/[^a-z0-9]+/).filter(Boolean);
  for (const token of tokens) {
    let hash = 2166136261;
    for (let index = 0; index < token.length; index += 1) {
      hash ^= token.charCodeAt(index); hash = Math.imul(hash, 16777619);
    }
    const slot = Math.abs(hash) % VECTOR_DIMENSIONS;
    vector[slot] += 1;
    if (token.length > 3) vector[(slot + token.length) % VECTOR_DIMENSIONS] += 0.35;
  }
  const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return magnitude ? vector.map((value) => value / magnitude) : vector;
}

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < length; index += 1) score += left[index] * right[index];
  return score;
}

function entryText(entry: Pick<KnowledgeEntry, "title" | "content" | "kind" | "source" | "tags">) {
  return [entry.title, entry.content, entry.kind, entry.source, ...entry.tags].join(" ");
}

function hydrate(entry: KnowledgeEntry): KnowledgeEntry {
  return { ...entry, tags: Array.isArray(entry.tags) ? entry.tags : [], vector: entry.vector?.length === VECTOR_DIMENSIONS ? entry.vector : createLocalVector(entryText(entry)) };
}

export function useKnowledgeBank() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as KnowledgeEntry[]).map(hydrate) : [];
    } catch { return []; }
  });

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); }, [entries]);

  const addEntry = useCallback((input: Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt" | "vector">) => {
    const now = new Date().toISOString();
    const entry = hydrate({ ...input, id: makeId(), createdAt: now, updatedAt: now });
    setEntries((current) => [entry, ...current]);
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => setEntries((current) => current.filter((entry) => entry.id !== id)), []);
  const clearAll = useCallback(() => setEntries([]), []);

  const importEntries = useCallback((incoming: KnowledgeEntry[]) => {
    const valid = incoming.filter((entry) => entry && entry.title && entry.content).map((entry) => hydrate({
      ...entry, id: entry.id || makeId(), tags: Array.isArray(entry.tags) ? entry.tags : [], source: entry.source || "GOD MODE import", kind: entry.kind || "document", createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    }));
    setEntries((current) => [...valid, ...current]);
    return valid.length;
  }, []);

  const exportEntries = useCallback(() => JSON.stringify(entries, null, 2), [entries]);

  const search = useCallback((query: string) => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return entries;
    const queryVector = createLocalVector(query);
    return entries.map((entry) => {
      const haystack = normalize(entryText(entry));
      const lexical = terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) / terms.length;
      const semantic = cosineSimilarity(queryVector, entry.vector || createLocalVector(entryText(entry)));
      return { entry, score: semantic * 0.7 + lexical * 0.3 };
    }).filter((result) => result.score > 0.08).sort((left, right) => right.score - left.score).map((result) => result.entry);
  }, [entries]);

  const getKnowledgeContext = useCallback((query = "") => {
    const relevant = search(query).slice(0, 12);
    if (!relevant.length) return "";
    return `\n\nLOCAL ENOSX KNOWLEDGE BANK (device-owned; vector-ranked context):\n${relevant.map((entry) => `- [${entry.kind.toUpperCase()}] ${entry.title}: ${entry.content}`).join("\n")}`;
  }, [search]);

  const rebuildIndex = useCallback(() => setEntries((current) => current.map((entry) => ({ ...entry, vector: createLocalVector(entryText(entry)), updatedAt: new Date().toISOString() }))), []);
  const stats = useMemo(() => ({ total: entries.length, words: entries.reduce((sum, entry) => sum + entry.content.split(/\s+/).filter(Boolean).length, 0), kinds: new Set(entries.map((entry) => entry.kind)).size, indexed: entries.filter((entry) => entry.vector?.length === VECTOR_DIMENSIONS).length }), [entries]);

  return { entries, addEntry, removeEntry, clearAll, importEntries, exportEntries, search, getKnowledgeContext, rebuildIndex, stats };
}

export async function readKnowledgeFile(file: File) {
  return { title: file.name.replace(/\.[^.]+$/, ""), content: await file.text(), source: file.name, kind: "document" as KnowledgeKind, tags: ["uploaded"] };
}
