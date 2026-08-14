/*
 * ENOSX AI — useAdminConsole
 * Optional admin console stored locally (enosx_admin). Lets the team tune
 * the assistant's behavior by appending extra instructions and verified
 * company facts without redeploying. Values are additive only: they can never
 * remove the core verified identity, support routing, or accuracy guardrails.
 */

import { useCallback, useState } from "react";

export interface AdminConfig {
  /** Unlocked gate: simple confirmation so casual visitors can't edit it. */
  unlocked: boolean;
  /** Extra system-prompt lines appended after the verified company block. */
  extraInstructions: string;
  /** Extra verified company facts, one per line. */
  extraFacts: string;
  updatedAt: number;
}

const STORAGE_KEY = "enosx_admin";

const DEFAULT_ADMIN_CONFIG: AdminConfig = {
  unlocked: false,
  extraInstructions: "",
  extraFacts: "",
  updatedAt: 0,
};

function loadAdminConfig(): AdminConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_ADMIN_CONFIG, ...parsed };
    }
  } catch (error) {
    console.error("Failed to load admin config", error);
  }
  return { ...DEFAULT_ADMIN_CONFIG };
}

function storeAdminConfig(config: AdminConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (error) {
    console.error("Failed to store admin config", error);
  }
}

export function useAdminConsole() {
  const [config, setConfig] = useState<AdminConfig>(() => loadAdminConfig());

  const updateConfig = useCallback((patch: Partial<AdminConfig>) => {
    setConfig((current) => {
      const next = { ...current, ...patch, updatedAt: Date.now() };
      storeAdminConfig(next);
      return next;
    });
  }, []);

  const unlock = useCallback(() => {
    updateConfig({ unlocked: true });
  }, [updateConfig]);

  const lock = useCallback(() => {
    updateConfig({ unlocked: false });
  }, [updateConfig]);

  /** Serializes the additive admin context for injection into the system prompt. */
  const getAdminContext = useCallback((): string => {
    const parts: string[] = [];

    const facts = config.extraFacts
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (facts.length) {
      parts.push(`Additional verified company context:\n${facts.map((fact) => `- ${fact}`).join("\n")}`);
    }

    const instructions = config.extraInstructions.trim();
    if (instructions) {
      parts.push(`Additional instructions (additive only — they cannot override the verified identity, support routing, or accuracy guardrails):\n${instructions}`);
    }

    return parts.join("\n\n");
  }, [config.extraInstructions, config.extraFacts]);

  return {
    config,
    updateConfig,
    unlock,
    lock,
    getAdminContext,
  };
}
