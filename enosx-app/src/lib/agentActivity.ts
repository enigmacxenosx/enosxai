import type { AgentEvent, AgentToolKind } from "./types";

export interface ToolActivityRow {
  id: string;
  kind: AgentToolKind;
  label: string;
  output?: string;
  ok?: boolean;
}
export type ActivityBlock =
  | { type: "message"; text: string }
  | { type: "tools"; rows: ToolActivityRow[]; running: boolean };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export function summarizeToolCalls(rows: ToolActivityRow[]): string {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const category = row.kind === "shell" ? "command" : row.kind === "read" ? "read file" : row.kind === "write" ? "written file" : row.kind === "github" ? "GitHub operation" : row.kind === "web" ? "web request" : "tool";
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => {
    if (category === "command") return `Ran ${plural(count, "command")}`;
    if (category === "read file") return `Read ${plural(count, "file")}`;
    if (category === "written file") return `Wrote ${plural(count, "file")}`;
    if (category === "GitHub operation") return `Used ${plural(count, "GitHub operation")}`;
    if (category === "web request") return `Fetched ${plural(count, "web page")}`;
    return `Ran ${plural(count, category)}`;
  }).join(" · ");
}

export function buildActivityBlocks(events: AgentEvent[]): ActivityBlock[] {
  const blocks: ActivityBlock[] = [];
  const rowsById = new Map<string, ToolActivityRow>();
  const toolGroups: Extract<ActivityBlock, { type: "tools" }>[] = [];
  let currentGroup: Extract<ActivityBlock, { type: "tools" }> | undefined;
  const closeGroup = () => {
    if (currentGroup) {
      toolGroups.push(currentGroup);
      blocks.push(currentGroup);
      currentGroup = undefined;
    }
  };
  for (const event of events) {
    if (event.type === "message") {
      closeGroup();
      const previous = blocks.at(-1);
      if (previous?.type === "message") previous.text += event.text;
      else blocks.push({ type: "message", text: event.text });
    } else if (event.type === "tool_call") {
      currentGroup ??= { type: "tools", rows: [], running: true };
      const row = { id: event.id, kind: event.kind, label: event.label };
      currentGroup.rows.push(row);
      rowsById.set(event.id, row);
    } else if (event.type === "tool_result") {
      const row = rowsById.get(event.id);
      if (row) {
        row.output = event.output;
        row.ok = event.ok;
      }
    } else if (event.type === "done" || event.type === "error") {
      toolGroups.forEach((group) => { group.running = false; });
      if (currentGroup) currentGroup.running = false;
    }
  }
  closeGroup();
  return blocks;
}
