import { nanoid } from "nanoid";
import type { Conversation } from "@/lib/types";

/** Create an independent conversation prefix ending at a completed agent reply. */
export function createConversationBranch(
  source: Conversation,
  messageId: string,
  now = new Date(),
): Conversation | null {
  const messageIndex = source.messages.findIndex((message) => message.id === messageId);
  const selectedMessage = source.messages[messageIndex];
  if (!selectedMessage || selectedMessage.role !== "assistant" || selectedMessage.isStreaming) return null;

  const baseTitle = source.title.replace(/^(?:Branch:\s*)+/i, "") || "New Chat";
  return {
    id: nanoid(),
    title: `Branch: ${baseTitle}`.slice(0, 80),
    messages: source.messages.slice(0, messageIndex + 1).map((message) => ({
      ...message,
      timestamp: new Date(message.timestamp),
      isStreaming: false,
    })),
    createdAt: new Date(now),
    updatedAt: new Date(now),
    branchOf: { conversationId: source.id, messageId },
  };
}
