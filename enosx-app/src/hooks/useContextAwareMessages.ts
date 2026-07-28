import { useCallback } from "react";
import { Message } from "@/lib/types";
import type { ActiveWindow } from "@/contexts/WindowContext";

export function useContextAwareMessages() {
  const enrichMessageWithContext = useCallback(
    (messages: Message[], activeWindow: ActiveWindow): Message[] => {
      if (!activeWindow.isDetected || activeWindow.appType === "unknown") {
        return messages;
      }

      // Add a system message at the beginning if not already present
      const hasContextMessage = messages.some(
        (m) => m.role === "system" && m.content.includes("Active Application:")
      );

      if (hasContextMessage) {
        return messages;
      }

      const contextMessage: Message = {
        id: "context-" + Date.now(),
        role: "system",
        content: `Active Application: ${activeWindow.appName} (${activeWindow.appType})
Window Title: ${activeWindow.windowTitle}

Tailor your response to be specifically helpful for this application. Acknowledge the app and provide relevant suggestions.`,
        timestamp: new Date(),
      };

      return [contextMessage, ...messages];
    },
    []
  );

  const getAppSpecificSuggestions = useCallback((appType: string) => {
    const suggestions: Record<string, string[]> = {
      vscode: [
        "Help me refactor this function",
        "Explain this code snippet",
        "Generate unit tests",
        "Find performance issues",
        "Create a component template",
      ],
      chrome: [
        "Summarize this page",
        "Extract key information",
        "Search for related topics",
        "Find similar resources",
      ],
      firefox: [
        "Summarize this page",
        "Extract key information",
        "Search for related topics",
      ],
      edge: [
        "Summarize this page",
        "Extract key information",
        "Search for related topics",
      ],
      terminal: [
        "Explain this command",
        "Help me write a script",
        "Troubleshoot an error",
        "Optimize my workflow",
      ],
      explorer: [
        "Organize my files",
        "Find duplicate files",
        "Batch rename files",
        "Clean up my folders",
      ],
      notion: [
        "Help me organize my notes",
        "Create a database template",
        "Query my database",
        "Design a workflow",
      ],
      slack: [
        "Draft a professional message",
        "Summarize the conversation",
        "Help me respond",
      ],
      discord: [
        "Draft a friendly message",
        "Summarize the conversation",
        "Help me respond",
      ],
      figma: [
        "Review my design",
        "Suggest improvements",
        "Create a component",
        "Organize my layers",
      ],
      photoshop: [
        "Help me edit this image",
        "Suggest filters",
        "Organize my layers",
        "Create a template",
      ],
    };

    return suggestions[appType] || [
      "What can I help you with?",
      "Tell me more about your task",
    ];
  }, []);

  return {
    enrichMessageWithContext,
    getAppSpecificSuggestions,
  };
}
