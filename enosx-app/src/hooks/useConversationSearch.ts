/*
 * ENOSX AI — useConversationSearch
 * Full-text search across all stored conversations (localStorage enosx_chats).
 * Returns matched messages with their conversation context for quick jumping.
 */

import { useCallback, useMemo, useState } from "react";
import { Conversation } from "@/lib/types";

export interface ConversationSearchMatch {
  conversationId: string;
  conversationTitle: string;
  messageIndex: number;
  snippet: string;
  timestamp: string;
}

const STORAGE_KEY = "enosx_chats";

function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return parsed.map((c: any) => ({
      ...c,
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.updatedAt),
      messages: c.messages.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })),
    }));
  } catch (error) {
    console.error("Failed to load conversations for search", error);
    return [];
  }
}

function buildSnippet(content: string, query: string, context = 60): string {
  const lowerContent = content.toLowerCase();
  const index = lowerContent.indexOf(query.toLowerCase());
  const start = Math.max(0, index - context);
  const end = Math.min(content.length, index + query.length + context);
  const slice = content.slice(start, end);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < content.length ? "..." : "";
  return `${prefix}${slice}${suffix}`;
}

export function useConversationSearch() {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const results: ConversationSearchMatch[] = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];
    const conversations = loadConversations();
    const matches: ConversationSearchMatch[] = [];

    for (const conversation of conversations) {
      conversation.messages.forEach((message, messageIndex) => {
        const content = message.content?.toString() ?? "";
        if (content.toLowerCase().includes(trimmed.toLowerCase())) {
          matches.push({
            conversationId: conversation.id,
            conversationTitle: conversation.title || "New Chat",
            messageIndex,
            snippet: buildSnippet(content, trimmed),
            timestamp: new Date(message.timestamp).toLocaleString(),
          });
        }
      });
    }

    // Newest matches first, capped to 200
    return matches.slice(0, 200);
  }, [query]);

  const open = useCallback(() => {
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  return {
    query,
    setQuery,
    isOpen,
    open,
    close,
    results,
    refresh: () => setQuery((current) => current),
  };
}
