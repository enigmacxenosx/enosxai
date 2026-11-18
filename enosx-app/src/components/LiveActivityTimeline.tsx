import { Check, Circle, Loader2 } from "lucide-react";

interface LiveActivityTimelineProps {
  status?: string;
  isStreaming?: boolean;
}

const STEPS = [
  { key: "received", label: "Request received" },
  { key: "analyzing", label: "Analyzing request" },
  { key: "drafting", label: "Drafting answer" },
  { key: "ready", label: "Answer ready" },
] as const;

function activeStep(status?: string) {
  const normalized = status?.toLowerCase() ?? "";
  if (normalized.includes("answer ready")) return 3;
  if (normalized.includes("draft")) return 2;
  if (normalized.includes("prepar")) return 1;
  if (normalized.includes("analyz")) return 1;
  return 0;
}

export default function LiveActivityTimeline({ status, isStreaming = false }: LiveActivityTimelineProps) {
  if (!status) return null;

  const current = activeStep(status);
  const complete = !isStreaming && current === 3;

  return (
    <div className="live-activity-timeline" role="status" aria-live="polite" aria-label="ENOSX activity">
      <div className="live-activity-header">
        <span className={`live-activity-pulse ${isStreaming ? "is-active" : ""}`} aria-hidden="true" />
        <span>{isStreaming ? "Working" : complete ? "Complete" : "Activity"}</span>
      </div>
      <div className="live-activity-steps">
        {STEPS.map((step, index) => {
          const isDone = index < current || (index === current && complete);
          const isCurrent = index === current && isStreaming;
          return (
            <div className={`live-activity-step ${isDone ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`} key={step.key}>
              <span className="live-activity-icon" aria-hidden="true">
                {isDone ? <Check size={11} strokeWidth={2.5} /> : isCurrent ? <Loader2 size={11} className="animate-spin" /> : <Circle size={7} />}
              </span>
              <span>{step.label}</span>
              {isCurrent && <span className="live-activity-now">Now</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
