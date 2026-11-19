import { Check, Circle, FileText, Github, Globe2, Pencil, Terminal, Wrench, X } from "lucide-react";
import { Streamdown } from "streamdown";
import { useTheme } from "@/contexts/ThemeContext";
import { buildActivityBlocks, summarizeToolCalls } from "@/lib/agentActivity";
import type { AgentEvent, AgentToolKind } from "@/lib/types";

interface LiveActivityTimelineProps {
  events?: AgentEvent[];
  isStreaming?: boolean;
  thinking?: boolean;
}

function ToolIcon({ kind }: { kind: AgentToolKind }) {
  const Icon = kind === "shell" ? Terminal : kind === "read" ? FileText : kind === "write" ? Pencil : kind === "github" ? Github : kind === "web" ? Globe2 : Wrench;
  return <Icon size={13} aria-hidden="true" />;
}

function middleEllipsis(label: string, maxLength = 48) {
  if (label.length <= maxLength) return label;
  const sideLength = Math.floor((maxLength - 1) / 2);
  return `${label.slice(0, sideLength)}…${label.slice(-sideLength)}`;
}

export default function LiveActivityTimeline({ events = [], isStreaming = false, thinking = false }: LiveActivityTimelineProps) {
  const { config } = useTheme();
  if (thinking && isStreaming && !events.some((event) => event.type === "message")) {
    return <div className="activity-thinking" role="status" aria-live="polite" style={{ color: config.textMuted }}><span className="activity-thinking-dot" aria-hidden="true" />Thinking</div>;
  }
  const blocks = buildActivityBlocks(events);
  if (!blocks.length) return null;
  return (
    <div className="live-activity-feed" aria-label="Agent activity">
      {blocks.map((block, index) => block.type === "message" ? (
        <div className="activity-narration" key={`message-${index}`}><Streamdown className="prose-crimson" mode="static">{block.text}</Streamdown></div>
      ) : (
        <details className="activity-tool-group" key={`tools-${index}`} open={isStreaming && block.rows.some((row) => row.ok === undefined)} style={{ color: config.text }}>
          <summary className="activity-group-summary">
            <span className="activity-summary-icon" aria-hidden="true"><ToolIcon kind={block.rows[0]?.kind ?? "other"} /></span>
            <span>{summarizeToolCalls(block.rows)}</span>
            {isStreaming && block.rows.some((row) => row.ok === undefined) && <span className="activity-running-dot" aria-label="Running" />}
          </summary>
          <div className="activity-tool-rows">
            {block.rows.map((row) => (
              <div className="activity-tool-row" key={row.id}>
                <span className="activity-tool-kind"><ToolIcon kind={row.kind} /></span>
                <span className="activity-tool-label" title={row.label}>{middleEllipsis(row.label)}</span>
                <span className={`activity-tool-status ${row.ok === false ? "is-error" : row.ok === true ? "is-success" : "is-running"}`} aria-label={row.ok === false ? "Failed" : row.ok === true ? "Succeeded" : "Running"}>
                  {row.ok === false ? <X size={14} /> : row.ok === true ? <Check size={14} /> : <Circle size={7} className={isStreaming ? "activity-running-dot-icon" : ""} />}
                </span>
                {row.output !== undefined && <pre className={`activity-tool-output ${row.ok === false ? "is-error" : ""}`}>{row.output}</pre>}
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
