/*
 * ENOSX AI — useAnalytics
 * Local, privacy-first usage analytics stored in localStorage (enosx_analytics).
 * Tracks message counts, question topics, voice and feature usage so the team
 * can surface the most-asked questions in an in-app dashboard. No data ever
 * leaves the user's browser unless a lead explicitly opts in.
 */

import { useCallback, useEffect, useState } from "react";
import { Conversation } from "@/lib/types";

export interface TopicCount {
  topic: string;
  count: number;
}

export interface AnalyticsState {
  totalMessages: number;
  totalConversations: number;
  questionTopics: TopicCount[];
  voiceUsageCount: number;
  lastUpdated: number;
}

const STORAGE_KEY = "enosx_analytics";

function normalizeTopic(text: string): string {
  return text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

export const DEFAULT_ANALYTICS: AnalyticsState = {
  totalMessages: 0,
  totalConversations: 0,
  questionTopics: [],
  voiceUsageCount: 0,
  lastUpdated: 0,
};

function loadAnalytics(): AnalyticsState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ANALYTICS, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load analytics", error);
  }
  return { ...DEFAULT_ANALYTICS };
}

function storeAnalytics(state: AnalyticsState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error("Failed to store analytics", error);
  }
}

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsState>(() => loadAnalytics());

  // Keep React state in sync with disk (other views may write to it)
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setAnalytics(loadAnalytics());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    storeAnalytics(analytics);
  }, [analytics]);

  const recordOutgoingMessage = useCallback(
    (text: string) => {
      setAnalytics((current) => {
        const topic = normalizeTopic(text);
        if (!topic) return { ...current, totalMessages: current.totalMessages + 1, lastUpdated: Date.now() };
        const topics = [...current.questionTopics];
        const existing = topics.find((entry) => entry.topic === topic);
        if (existing) {
          existing.count += 1;
        } else {
          topics.push({ topic, count: 1 });
        }
        topics.sort((a, b) => b.count - a.count);
        return {
          ...current,
          totalMessages: current.totalMessages + 1,
          questionTopics: topics.slice(0, 50),
          lastUpdated: Date.now(),
        };
      });
    },
    []
  );

  const recordVoiceUsage = useCallback(() => {
    setAnalytics((current) => ({
      ...current,
      voiceUsageCount: current.voiceUsageCount + 1,
      lastUpdated: Date.now(),
    }));
  }, []);

  /** Derive a simple analytics summary from all conversations in storage. */
  const refreshFromConversations = useCallback((conversations: Conversation[]) => {
    setAnalytics((current) => {
      const totalMessages = conversations.reduce((sum, c) => sum + c.messages.length, 0);
      return {
        ...current,
        totalMessages,
        totalConversations: conversations.length,
        lastUpdated: Date.now(),
      };
    });
  }, []);

  const resetAnalytics = useCallback(() => {
    setAnalytics({ ...DEFAULT_ANALYTICS });
  }, []);

  return {
    analytics,
    recordOutgoingMessage,
    recordVoiceUsage,
    refreshFromConversations,
    resetAnalytics,
  };
}
