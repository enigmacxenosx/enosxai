export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string; // Base64 for images, text for others
  url?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
}

export type VoiceState = "idle" | "listening" | "processing" | "speaking";
