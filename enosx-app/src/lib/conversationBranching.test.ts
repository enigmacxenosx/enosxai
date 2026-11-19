import { describe, expect, it } from "vitest";
import type { Conversation } from "@/lib/types";
import { createConversationBranch } from "./conversationBranching";

const createdAt = new Date("2026-11-19T10:00:00.000Z");
const source: Conversation = {
  id: "source-chat",
  title: "Project planning",
  createdAt,
  updatedAt: createdAt,
  messages: [
    { id: "user-1", role: "user", content: "Help me plan", timestamp: createdAt },
    { id: "assistant-1", role: "assistant", content: "First answer", timestamp: createdAt },
    { id: "user-2", role: "user", content: "Follow-up", timestamp: createdAt },
    { id: "assistant-2", role: "assistant", content: "Second answer", timestamp: createdAt },
  ],
};

describe("createConversationBranch", () => {
  it("copies only through the selected completed assistant reply and records its origin", () => {
    const now = new Date("2026-11-19T12:00:00.000Z");
    const branch = createConversationBranch(source, "assistant-1", now);

    expect(branch).not.toBeNull();
    expect(branch?.id).not.toBe(source.id);
    expect(branch?.title).toBe("Branch: Project planning");
    expect(branch?.messages.map((message) => message.id)).toEqual(["user-1", "assistant-1"]);
    expect(branch?.branchOf).toEqual({ conversationId: "source-chat", messageId: "assistant-1" });
    expect(branch?.createdAt).toEqual(now);
    expect(branch?.messages[0]).not.toBe(source.messages[0]);
    expect(source.messages).toHaveLength(4);
    expect(source.title).toBe("Project planning");
  });

  it("does not branch from user or streaming messages", () => {
    expect(createConversationBranch(source, "user-1")).toBeNull();
    const streamingSource: Conversation = {
      ...source,
      messages: source.messages.map((message) => message.id === "assistant-1" ? { ...message, isStreaming: true } : message),
    };
    expect(createConversationBranch(streamingSource, "assistant-1")).toBeNull();
  });
});
