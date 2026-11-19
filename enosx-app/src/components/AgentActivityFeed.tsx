import { useEffect, useRef } from "react";
import { AlertCircle, Check, MessageSquareText } from "lucide-react";
import { getActivityMessages, getActivityStatus, type AgentActivityEvent } from "@/lib/agentActivity";

type AgentActivityFeedProps = {
  events?: AgentActivityEvent[];
  isStreaming?: boolean;
};

const STATUS_LABELS = {
  thinking: "Thinking",
  working: "Working",
  finished: "Finished",
  error: "Needs attention",
} as const;

export default function AgentActivityFeed({ events = [], isStreaming = false }: AgentActivityFeedProps) {
  const feedRef = useRef<HTMLDivElement>(null);
  const status = getActivityStatus(events, isStreaming);
  const entries = getActivityMessages(events);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const distanceFromBottom = feed.scrollHeight - feed.scrollTop - feed.clientHeight;
    if (distanceFromBottom < 48) feed.scrollTop = feed.scrollHeight;
  }, [entries.length]);

  if (entries.length === 0 && !isStreaming) return null;

  return (
    <section className="agent-activity-feed" aria-label="ENOSX activity">
      <div ref={feedRef} className="agent-activity-feed__events" role="log" aria-live="polite" aria-relevant="additions text">
        {entries.map((event, index) => (
          <div className={`agent-activity-feed__event ${event.type === "error" ? "is-error" : ""}`} key={`${event.type}-${index}`}>
            {event.type === "error" ? <AlertCircle size={14} aria-hidden="true" /> : <MessageSquareText size={14} aria-hidden="true" />}
            <span>{event.type === "error" ? event.message : event.text}</span>
          </div>
        ))}
      </div>
      <div className="agent-activity-feed__status" role="status" aria-live="polite">
        <span className={`agent-activity-feed__dot ${isStreaming ? "is-active" : ""} ${status === "error" ? "is-error" : ""}`} aria-hidden="true" />
        <span>{STATUS_LABELS[status]}</span>
        {status === "finished" && <Check size={14} aria-hidden="true" />}
      </div>
    </section>
  );
}
