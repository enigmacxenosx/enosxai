/*
 * ENOSX AI — useMemoryBank
 * Manages persistent long-term memory for the AI.
 * Stores user preferences, project details, and key facts in localStorage.
 * Provides a "Memory Context" that is automatically injected into AI prompts.
 */
import { useState, useEffect, useCallback } from "react";

export interface MemoryEntry {
  id: string;
  category: "preference" | "project" | "fact" | "instruction" | "skill" | "agent" | "system";
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

const STORAGE_KEY = "enosx_memory_bank";

export function useMemoryBank() {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);

  // Load memories on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setMemories(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch (e) {
        console.error("Failed to parse memories", e);
      }
    }
  }, []);

  // Save memories whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
  }, [memories]);

  const addMemory = useCallback((category: MemoryEntry["category"], content: string, metadata?: Record<string, any>) => {
    const newEntry: MemoryEntry = {
      id: Math.random().toString(36).substr(2, 9),
      category,
      content,
      timestamp: new Date(),
      metadata
    };
    setMemories(prev => [newEntry, ...prev]);
  }, []);

  const removeMemory = useCallback((id: string) => {
    setMemories(prev => prev.filter(m => m.id !== id));
  }, []);

  const clearMemories = useCallback(() => {
    setMemories([]);
  }, []);

  const getMemoryContext = useCallback(() => {
    if (memories.length === 0) return "";
    
    const contextLines = memories
      .filter(m => m.category !== 'skill' && m.category !== 'agent')
      .map(m => `- [${m.category.toUpperCase()}]: ${m.content}`);
    
    const skillLines = memories
      .filter(m => m.category === 'skill')
      .map(m => `- [SKILL]: ${m.content}`);

    const agentLines = memories
      .filter(m => m.category === 'agent')
      .map(m => `- [SPECIALIZED AGENT]: ${m.content}`);

    return `\n\nUSER LONG-TERM MEMORY:\n${contextLines.join("\n")}\n${skillLines.join("\n")}\n${agentLines.join("\n")}\nUse this context to personalize your responses.`;
  }, [memories]);

  return {
    memories,
    addMemory,
    removeMemory,
    clearMemories,
    getMemoryContext
  };
}
