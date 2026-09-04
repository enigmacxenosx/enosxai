import { useCallback, useEffect, useMemo, useState } from "react";

export type KnowledgeKind = "fact" | "instruction" | "document" | "skill" | "project";
export const VECTOR_DIMENSIONS = 96;
export interface KnowledgeEntry { id: string; title: string; content: string; kind: KnowledgeKind; tags: string[]; source: string; vector?: number[]; createdAt: string; updatedAt: string; }
const STORAGE_KEY = "enosx_knowledge_bank_v1";
function makeId() { return `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`; }
function normalize(value: string) { return value.trim().toLowerCase(); }
export function createLocalVector(text: string): number[] { const vector = new Array<number>(VECTOR_DIMENSIONS).fill(0); const tokens = normalize(text).split(/[^a-z0-9]+/).filter(Boolean); for (const token of tokens) { let hash = 2166136261; for (let index = 0; index < token.length; index += 1) { hash ^= token.charCodeAt(index); hash = Math.imul(hash, 16777619); } const slot = Math.abs(hash) % VECTOR_DIMENSIONS; vector[slot] += 1; if (token.length > 3) vector[(slot + token.length) % VECTOR_DIMENSIONS] += 0.35; } const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)); return magnitude ? vector.map((value) => value / magnitude) : vector; }
function cosineSimilarity(left: number[], right: number[]) { let score = 0; for (let index = 0; index < Math.min(left.length, right.length); index += 1) score += left[index] * right[index]; return score; }
function entryText(entry: Pick<KnowledgeEntry, "title" | "content" | "kind" | "source" | "tags">) { return [entry.title, entry.content, entry.kind, entry.source, ...entry.tags].join(" "); }
function hydrate(entry: KnowledgeEntry): KnowledgeEntry { return { ...entry, tags: Array.isArray(entry.tags) ? entry.tags : [], vector: entry.vector?.length === VECTOR_DIMENSIONS ? entry.vector : createLocalVector(entryText(entry)) }; }
function loadEntries() { try { const saved = localStorage.getItem(STORAGE_KEY); return saved ? (JSON.parse(saved) as KnowledgeEntry[]).map(hydrate) : []; } catch { return []; } }

export function useKnowledgeBank() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(loadEntries);
  const commit = useCallback((next: KnowledgeEntry[]) => { setEntries(next); localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); window.dispatchEvent(new CustomEvent("enosx:knowledge-updated")); }, []);
  useEffect(() => { const refresh = () => setEntries(loadEntries()); window.addEventListener("storage", refresh); window.addEventListener("enosx:knowledge-updated", refresh); return () => { window.removeEventListener("storage", refresh); window.removeEventListener("enosx:knowledge-updated", refresh); }; }, []);
  const addEntry = useCallback((input: Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt" | "vector">) => { const now = new Date().toISOString(); const entry = hydrate({ ...input, id: makeId(), createdAt: now, updatedAt: now }); commit([entry, ...loadEntries()]); return entry; }, [commit]);
  const removeEntry = useCallback((id: string) => commit(loadEntries().filter((entry) => entry.id !== id)), [commit]);
  const clearAll = useCallback(() => commit([]), [commit]);
  const importEntries = useCallback((incoming: KnowledgeEntry[]) => { const valid = incoming.filter((entry) => entry && entry.title && entry.content).map((entry) => hydrate({ ...entry, id: entry.id || makeId(), tags: Array.isArray(entry.tags) ? entry.tags : [], source: entry.source || "GOD MODE import", kind: entry.kind || "document", createdAt: entry.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString() })); commit([...valid, ...loadEntries()]); return valid.length; }, [commit]);
  const exportEntries = useCallback(() => JSON.stringify(loadEntries(), null, 2), []);
  const search = useCallback((query: string) => { const current = loadEntries(); const terms = normalize(query).split(/\s+/).filter(Boolean); if (!terms.length) return current; const queryVector = createLocalVector(query); return current.map((entry) => { const haystack = normalize(entryText(entry)); const lexical = terms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0) / terms.length; const semantic = cosineSimilarity(queryVector, entry.vector || createLocalVector(entryText(entry))); return { entry, score: semantic * 0.7 + lexical * 0.3 }; }).filter((result) => result.score > 0.08).sort((left, right) => right.score - left.score).map((result) => result.entry); }, []);
  const getKnowledgeContext = useCallback((query = "") => { const relevant = search(query).slice(0, 12); return relevant.length ? `\n\nLOCAL ENOSX KNOWLEDGE BANK (device-owned; vector-ranked context):\n${relevant.map((entry) => `- [${entry.kind.toUpperCase()}] ${entry.title}: ${entry.content}`).join("\n")}` : ""; }, [search]);
  const rebuildIndex = useCallback(() => commit(loadEntries().map((entry) => ({ ...entry, vector: createLocalVector(entryText(entry)), updatedAt: new Date().toISOString() }))), [commit]);
  const stats = useMemo(() => { const current = entries; return { total: current.length, words: current.reduce((sum, entry) => sum + entry.content.split(/\s+/).filter(Boolean).length, 0), kinds: new Set(current.map((entry) => entry.kind)).size, indexed: current.filter((entry) => entry.vector?.length === VECTOR_DIMENSIONS).length }; }, [entries]);
  return { entries, addEntry, removeEntry, clearAll, importEntries, exportEntries, search, getKnowledgeContext, rebuildIndex, stats };
}
export async function readKnowledgeFile(file: File) { return { title: file.name.replace(/\.[^.]+$/, ""), content: await file.text(), source: file.name, kind: "document" as KnowledgeKind, tags: ["uploaded"] }; }
