/*
 * ENOSX AI — useMemoryBank
 * Manages persistent long-term memory for the AI.
 * Memory is device-owned and is ranked per request so unrelated memories do not
 * crowd the model context window. Signed-in accounts also sync user memories
 * to Firestore so recall survives across sessions and devices.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { loadMemoryBank, saveMemoryBank, type StoredMemoryEntry } from "@/lib/firebaseStorage";

export interface MemoryEntry {
  id: string;
  category: "preference" | "project" | "fact" | "instruction" | "skill" | "agent" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface UseMemoryBankOptions {
  /** Firebase uid of the signed-in owner, or undefined for guest sessions. */
  ownerId?: string;
}

const STORAGE_KEY = "enosx_memory_bank";
const MAX_CONTEXT_CHARS = 9000;
const MAX_USER_MEMORIES = 14;
const SYNC_DEBOUNCE_MS = 900;

function loadStoredMemories(): MemoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : [];
  } catch { return []; }
}

function tokenize(value: string) {
  return new Set(value.toLowerCase().split(/[^a-z0-9]+/).filter((token) => token.length > 1));
}

function scoreMemory(memory: MemoryEntry, queryTokens: Set<string>) {
  if (!queryTokens.size || memory.category === "system") return 0;
  const tokens = tokenize(`${memory.category} ${memory.content}`);
  let overlap = 0;
  queryTokens.forEach((token) => { if (tokens.has(token)) overlap += 1; });
  const ageDays = Math.max(0, (Date.now() - memory.timestamp.getTime()) / 86_400_000);
  const recency = Math.max(0, 1 - ageDays / 365) * 0.05;
  return overlap / queryTokens.size + recency;
}

const SYNCABLE_CATEGORIES = ["preference", "project", "fact", "instruction", "skill", "agent"];

function normalizeStoredMemory(value: unknown): MemoryEntry | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const category = typeof record.category === "string" ? record.category : "";
  if (!SYNCABLE_CATEGORIES.includes(category)) return null;
  const content = typeof record.content === "string" ? record.content.trim() : "";
  if (!content || content.length > 4_000) return null;
  const parsedTimestamp = record.timestamp ? new Date(String(record.timestamp)) : new Date();
  return {
    id: typeof record.id === "string" && record.id ? record.id : crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11),
    category: category as MemoryEntry["category"],
    content,
    timestamp: Number.isNaN(parsedTimestamp.getTime()) ? new Date() : parsedTimestamp,
    metadata: record.metadata && typeof record.metadata === "object" ? (record.metadata as Record<string, any>) : undefined,
  };
}

function memoryKey(memory: MemoryEntry) {
  return memory.content.trim().toLowerCase().replace(/\s+/g, " ");
}

export function useMemoryBank(options: UseMemoryBankOptions = {}) {
  const { ownerId } = options;
  const [memories, setMemories] = useState<MemoryEntry[]>(loadStoredMemories);
  const remoteSaveTimer = useRef<number | null>(null);

  const systemMemories = useMemo<MemoryEntry[]>(() => [
    { id: "sys-1", category: "system", content: "I am ENOSX AI, an intelligent workspace developed by Enosx Technologies. Enosx Technologies was founded in Nairobi, Kenya in 2024 by Enosh Yeswa, its Founder and Chief Executive Officer. Our mission is to make software feel instant through multimodal AI assistants, commerce experiences, and coaching products.", timestamp: new Date() },
    { id: "sys-2", category: "system", content: "Enosx Technologies' live products are ENOSX AI and the Enosx Tech Store for technology products and digital services. I use a glassmorphic, iridescent design language inspired by cyberpunk aesthetics.", timestamp: new Date() },
    { id: "sys-3", category: "system", content: "I have deep integration with GitHub, allowing me to browse repositories, edit files, and push changes directly via the GitHub REST API. I support multiple PAT tokens for different accounts.", timestamp: new Date() },
    { id: "sys-4", category: "system", content: "I possess browser automation capabilities, including reading webpages, extracting links, clicking elements, filling forms, and taking screenshots.", timestamp: new Date() },
    { id: "sys-5", category: "system", content: "I feature a 'God Mode' for advanced system-level operations and a 'Screen Guide' for interactive assistance.", timestamp: new Date() },
    { id: "sys-6", category: "system", content: "My codebase is organized into a monorepo structure with an 'enosx-app' for the frontend, 'lib' for shared logic and API clients, and 'scripts' for utility tasks.", timestamp: new Date() },
  ], []);

  useEffect(() => {
    const refresh = () => setMemories(loadStoredMemories());
    window.addEventListener("storage", refresh);
    window.addEventListener("enosx:memory-updated", refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener("enosx:memory-updated", refresh); };
  }, []);

  const scheduleRemoteSave = useCallback((entries: MemoryEntry[]) => {
    if (!ownerId || typeof window === "undefined") return;
    if (remoteSaveTimer.current) window.clearTimeout(remoteSaveTimer.current);
    remoteSaveTimer.current = window.setTimeout(() => {
      const syncable = entries
        .filter((entry) => entry.category !== "system")
        .map<StoredMemoryEntry>((entry) => ({
          id: entry.id,
          category: entry.category,
          content: entry.content,
          timestamp: entry.timestamp.toISOString(),
          metadata: entry.metadata,
        }));
      void saveMemoryBank(ownerId, syncable).catch((error) => {
        console.error("[useMemoryBank] Failed to sync the memory bank:", error);
      });
    }, SYNC_DEBOUNCE_MS);
  }, [ownerId]);

  useEffect(() => () => {
    if (remoteSaveTimer.current) window.clearTimeout(remoteSaveTimer.current);
  }, []);

  // Merge the signed-in account's synced bank with this device's local bank.
  // Entries are de-duplicated by content; the newest copy wins.
  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    void loadMemoryBank(ownerId).then((stored) => {
      if (cancelled) return;
      const remoteEntries = stored.map(normalizeStoredMemory).filter((entry): entry is MemoryEntry => Boolean(entry));
      const local = loadStoredMemories();
      const byContent = new Map<string, MemoryEntry>();
      for (const entry of [...remoteEntries, ...local]) {
        const key = memoryKey(entry);
        const existing = byContent.get(key);
        if (!existing || entry.timestamp.getTime() > existing.timestamp.getTime()) byContent.set(key, entry);
      }
      const merged = Array.from(byContent.values()).sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime());
      setMemories(merged);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* local persistence is best-effort */ }
      if (merged.length !== local.length) scheduleRemoteSave(merged);
    }).catch((error) => {
      console.error("[useMemoryBank] Failed to load the synced memory bank:", error);
    });
    return () => { cancelled = true; };
  }, [ownerId, scheduleRemoteSave]);

  const commitMemories = useCallback((next: MemoryEntry[]) => {
    setMemories(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("enosx:memory-updated"));
    scheduleRemoteSave(next);
  }, [scheduleRemoteSave]);

  const addMemory = useCallback((category: MemoryEntry["category"], content: string, metadata?: Record<string, any>) => {
    const normalized = content.trim();
    if (!normalized) return;
    const newEntry: MemoryEntry = { id: crypto.randomUUID?.() || Math.random().toString(36).slice(2, 11), category, content: normalized, timestamp: new Date(), metadata };
    commitMemories([newEntry, ...loadStoredMemories()]);
  }, [commitMemories]);

  const removeMemory = useCallback((id: string) => commitMemories(loadStoredMemories().filter((m) => m.id !== id)), [commitMemories]);
  const clearMemories = useCallback(() => commitMemories([]), [commitMemories]);

  const getMemoryContext = useCallback((query = "") => {
    const queryTokens = tokenize(query);
    const system = systemMemories.map((memory) => `- [SYSTEM]: ${memory.content}`);
    const ranked = [...memories]
      .filter((memory) => memory.category !== "system" && memory.category !== "skill" && memory.category !== "agent")
      .map((memory) => ({ memory, score: scoreMemory(memory, queryTokens) }))
      .filter(({ score, memory }) => !queryTokens.size || score > 0)
      .sort((left, right) => right.score - left.score || right.memory.timestamp.getTime() - left.memory.timestamp.getTime())
      .slice(0, MAX_USER_MEMORIES)
      .map(({ memory }) => `- [${memory.category.toUpperCase()}]: ${memory.content}`);
    const skills = memories.filter((memory) => memory.category === "skill").slice(0, 3).map((memory) => `- [SKILL]: ${memory.content}`);
    const agents = memories.filter((memory) => memory.category === "agent").slice(0, 3).map((memory) => `- [SPECIALIZED AGENT]: ${memory.content}`);
    const lines = [...system, ...ranked, ...skills, ...agents];
    let result = "\n\nUSER LONG-TERM MEMORY & SYSTEM KNOWLEDGE:\n";
    for (const line of lines) {
      if (result.length + line.length + 1 > MAX_CONTEXT_CHARS) break;
      result += `${line}\n`;
    }
    return result.trimEnd();
  }, [memories, systemMemories]);

  return { memories, addMemory, removeMemory, clearMemories, getMemoryContext };
}
