import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { AgentEvent } from "./types";
import { buildActivityBlocks, summarizeToolCalls } from "./agentActivity";

vi.mock("@/contexts/ThemeContext", () => ({
  useTheme: () => ({ config: { text: "#111", textMuted: "#666" } }),
}));
import LiveActivityTimeline from "@/components/LiveActivityTimeline";

describe("agent activity feed", () => {
  it("shows only the pending Thinking indicator for a no-tools reply, then only the answer", () => {
    const { rerender, container } = render(<LiveActivityTimeline events={[{ type: "status", state: "thinking" }]} isStreaming thinking />);
    expect(screen.getByRole("status")).toHaveTextContent("Thinking");
    expect(container.querySelector("details")).toBeNull();

    rerender(<LiveActivityTimeline events={[{ type: "status", state: "thinking" }, { type: "status", state: "working" }, { type: "message", text: "Hello there." }, { type: "done" }]} />);
    expect(screen.getByText("Hello there.")).toBeInTheDocument();
    expect(screen.queryByText("Thinking")).not.toBeInTheDocument();
    expect(container.querySelector("details")).toBeNull();
  });

  it("groups consecutive calls into one group and computes an action-specific summary", () => {
    const events: AgentEvent[] = [
      { type: "tool_call", id: "c1", kind: "shell", label: "run tests" },
      { type: "tool_call", id: "c2", kind: "shell", label: "check types" },
      { type: "tool_call", id: "r1", kind: "read", label: "open package.json" },
      { type: "tool_result", id: "c1", output: "ok", ok: true },
      { type: "tool_result", id: "c2", output: "ok", ok: true },
      { type: "tool_result", id: "r1", output: "{}", ok: true },
      { type: "done" },
    ];
    const blocks = buildActivityBlocks(events);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].type).toBe("tools");
    if (blocks[0].type === "tools") {
      expect(blocks[0].rows).toHaveLength(3);
      expect(summarizeToolCalls(blocks[0].rows)).toBe("Ran 2 commands · Read 1 file");
    }
    const { container } = render(<LiveActivityTimeline events={events} />);
    expect(container.querySelectorAll("details")).toHaveLength(1);
    expect(screen.getByText("Ran 2 commands · Read 1 file")).toBeInTheDocument();
  });

  it("keeps failed tool output and a failure result", () => {
    const blocks = buildActivityBlocks([
      { type: "tool_call", id: "bad", kind: "shell", label: "run failing command" },
      { type: "tool_result", id: "bad", output: "permission denied", ok: false },
      { type: "done" },
    ]);
    expect(blocks[0].type).toBe("tools");
    if (blocks[0].type === "tools") {
      expect(blocks[0].rows[0]).toMatchObject({ id: "bad", output: "permission denied", ok: false });
    }
    render(<LiveActivityTimeline events={[{ type: "tool_call", id: "bad", kind: "shell", label: "run failing command" }, { type: "tool_result", id: "bad", output: "permission denied", ok: false }, { type: "done"}]} />);
    expect(screen.getByText("permission denied")).toBeInTheDocument();
    expect(screen.getByLabelText("Failed")).toBeInTheDocument();
  });

  it("closes a tool group at a message event and continues the narration after it", () => {
    const blocks = buildActivityBlocks([
      { type: "tool_call", id: "t1", kind: "web", label: "fetch page" },
      { type: "tool_result", id: "t1", output: "page text", ok: true },
      { type: "message", text: "Here is the result." },
      { type: "tool_call", id: "t2", kind: "read", label: "read file" },
      { type: "tool_result", id: "t2", output: "contents", ok: true },
      { type: "done" },
    ]);
    expect(blocks.map((block) => block.type)).toEqual(["tools", "message", "tools"]);
    expect(blocks[1]).toEqual({ type: "message", text: "Here is the result." });
  });

  it("ignores results for unknown ids without throwing", () => {
    expect(() => buildActivityBlocks([
      { type: "tool_result", id: "missing", output: "orphan result", ok: false },
      { type: "done" },
    ])).not.toThrow();
    expect(buildActivityBlocks([{ type: "tool_result", id: "missing", output: "orphan result", ok: false }])).toEqual([]);
  });
});
