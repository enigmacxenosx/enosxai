export type AgentActivityEvent =
  | { type: "status"; state: "thinking" | "working" }
  | { type: "message"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

export function getActivityMessages(events: AgentActivityEvent[]) {
  return events.filter((event): event is Extract<AgentActivityEvent, { type: "message" | "error" }> =>
    event.type === "message" || event.type === "error",
  );
}

export function getActivityStatus(events: AgentActivityEvent[], isStreaming: boolean): "thinking" | "working" | "finished" | "error" {
  if (events.some((event) => event.type === "error")) return "error";
  if (!isStreaming || events.some((event) => event.type === "done")) return "finished";
  const lastStatus = [...events].reverse().find((event) => event.type === "status");
  return lastStatus?.type === "status" ? lastStatus.state : "thinking";
}
