export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // Data URL for binary files, text for text files
  mimeType?: string; // Original browser MIME type, when available
  url?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
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
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking";
