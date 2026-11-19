export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // Data URL for binary files, text for text files
  mimeType?: string; // Original browser MIME type, when available
  analysisContent?: string; // Browser-extracted document text or media description
  analysisFrames?: string[]; // Representative video frames sent to the vision model
  url?: string;
}

export type AgentToolKind = "shell" | "read" | "write" | "github" | "web" | "other";
export type AgentEvent =
  | { type: "status"; state: "thinking" | "working" }
  | { type: "message"; text: string }
  | { type: "tool_call"; id: string; kind: AgentToolKind; label: string }
  | { type: "tool_result"; id: string; output: string; ok: boolean }
  | { type: "done" }
  | { type: "error"; code: string; retryable: boolean; message: string };
export interface MessageStreamError {
  code: string;
  retryable: boolean;
  message: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  activityEvents?: AgentEvent[];
  streamError?: MessageStreamError;
  attachments?: Attachment[];
  proposedActions?: AssistantAction[];
}

export interface AssistantAction {
  type: "open_url" | "launch_app" | "read_webpage" | "extract_links" | "click_element" | "fill_form" | "chain" | "delay";
  url?: string;
  app?: string;
  selector?: string;
  fields?: Array<{ selector: string; value: string }>;
  delay?: number;
  sequence?: AssistantAction[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  branchOf?: {
    conversationId: string;
    messageId: string;
  };
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking";
