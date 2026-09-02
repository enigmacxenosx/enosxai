import { useCallback, useEffect, useMemo, useState } from "react";

export type KnowledgeKind = "fact" | "instruction" | "document" | "skill" | "project";

export interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  kind: KnowledgeKind;
  tags: string[];
  source: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "enosx_knowledge_bank_v1";

function makeId() {
  return `kb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function useKnowledgeBank() {
  const [entries, setEntries] = useState<KnowledgeEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as KnowledgeEntry[]) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const addEntry = useCallback((input: Omit<KnowledgeEntry, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const entry: KnowledgeEntry = { ...input, id: makeId(), createdAt: now, updatedAt: now };
    setEntries((current) => [entry, ...current]);
    return entry;
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const clearAll = useCallback(() => setEntries([]), []);

  const importEntries = useCallback((incoming: KnowledgeEntry[]) => {
    const valid = incoming.filter((entry) => entry && entry.title && entry.content).map((entry) => ({
      ...entry,
      id: entry.id || makeId(),
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      source: entry.source || "GOD MODE import",
      kind: entry.kind || "document",
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    setEntries((current) => [...valid, ...current]);
    return valid.length;
  }, []);

  const exportEntries = useCallback(() => JSON.stringify(entries, null, 2), [entries]);

  const search = useCallback((query: string) => {
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return entries;
    return entries.filter((entry) => {
      const haystack = normalize([entry.title, entry.content, entry.kind, entry.source, ...entry.tags].join(" "));
      return terms.every((term) => haystack.includes(term));
    });
  }, [entries]);

  const getKnowledgeContext = useCallback((query = "") => {
    const relevant = search(query).slice(0, 12);
    if (!relevant.length) return "";
    return `\n\nLOCAL ENOSX KNOWLEDGE BANK (device-owned; treat as user-provided context):\n${relevant.map((entry) => `- [${entry.kind.toUpperCase()}] ${entry.title}: ${entry.content}`).join("\n")}`;
  }, [search]);

  const stats = useMemo(() => ({
    total: entries.length,
    words: entries.reduce((sum, entry) => sum + entry.content.split(/\s+/).filter(Boolean).length, 0),
    kinds: new Set(entries.map((entry) => entry.kind)).size,
  }), [entries]);

  return { entries, addEntry, removeEntry, clearAll, importEntries, exportEntries, search, getKnowledgeContext, stats };
}

export async function readKnowledgeFile(file: File) {
  const content = await file.text();
  return {
    title: file.name.replace(/\.[^.]+$/, ""),
    content,
    source: file.name,
    kind: "document" as KnowledgeKind,
    tags: ["uploaded"],
  };
}
