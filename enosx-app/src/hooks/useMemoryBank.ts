/*
 * ENOSX AI — useMemoryBank
 * Manages persistent long-term memory for the AI.
 * Stores user preferences, project details, and key facts in localStorage.
 * Provides a "Memory Context" that is automatically injected into AI prompts.
 */
import { useState, useEffect, useCallback, useMemo } from "react";

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

  // System-level memories that are always present but not necessarily stored in localStorage
  const systemMemories = useMemo<MemoryEntry[]>(() => [
    {
      id: "sys-1",
      category: "system",
      content: "I am ENOSX AI, an autonomous AI agent developed by Enosx Technologies. My mission is to transform businesses with cutting-edge AI and tech solutions.",
      timestamp: new Date(),
    },
    {
      id: "sys-2",
      category: "system",
      content: "My architecture is built using React, TypeScript, and Tailwind CSS. I use a glassmorphic, iridescent design language inspired by cyberpunk aesthetics.",
      timestamp: new Date(),
    },
    {
      id: "sys-3",
      category: "system",
      content: "I have deep integration with GitHub, allowing me to browse repositories, edit files, and push changes directly via the GitHub REST API. I support multiple PAT tokens for different accounts.",
      timestamp: new Date(),
    },
    {
      id: "sys-4",
      category: "system",
      content: "I possess browser automation capabilities, including reading webpages, extracting links, clicking elements, filling forms, and taking screenshots.",
      timestamp: new Date(),
    },
    {
      id: "sys-5",
      category: "system",
      content: "I feature a 'God Mode' for advanced system-level operations and a 'Screen Guide' for interactive assistance.",
      timestamp: new Date(),
    },
    {
      id: "sys-6",
      category: "system",
      content: "My codebase is organized into a monorepo structure with an 'enosx-app' for the frontend, 'lib' for shared logic and API clients, and 'scripts' for utility tasks.",
      timestamp: new Date(),
    },
  ], []);

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
    const allMemories = [...systemMemories, ...memories];
    
    if (allMemories.length === 0) return "";
    
    const contextLines = allMemories
      .filter(m => m.category !== 'skill' && m.category !== 'agent')
      .map(m => `- [${m.category.toUpperCase()}]: ${m.content}`);
    
    const skillLines = allMemories
      .filter(m => m.category === 'skill')
      .map(m => `- [SKILL]: ${m.content}`);

    const agentLines = allMemories
      .filter(m => m.category === 'agent')
      .map(m => `- [SPECIALIZED AGENT]: ${m.content}`);

    return `\n\nUSER LONG-TERM MEMORY & SYSTEM KNOWLEDGE:\n${contextLines.join("\n")}\n${skillLines.join("\n")}\n${agentLines.join("\n")}\nUse this context to personalize your responses and understand your own capabilities.`;
  }, [memories, systemMemories]);

  return {
    memories,
    addMemory,
    removeMemory,
    clearMemories,
    getMemoryContext
  };
}
