export interface MailMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body: string;
  date: string; // ISO 8601
  isRead: boolean;
  folder: "inbox" | "sent";
}

export interface MailFilters {
  sender?: string;
  keyword?: string;
  unreadOnly?: boolean;
  sinceDays?: number | null;
}

export interface ComposeDraft {
  to: string;
  subject: string;
  body: string;
  inReplyToMessageId?: string;
  threadId?: string;
}

/**
 * The fixed contract between the assistant and the UI.
 * Claude is given this shape (as an Anthropic tool schema, see lib/assistant.ts)
 * and must resolve every user command into exactly one of these -- it never
 * emits free-form UI instructions, only one of these typed actions. The UI
 * layer (hooks/useMailState.ts) is the only thing that executes them, which
 * is what keeps the assistant from being able to do anything the ordinary
 * UI itself couldn't.
 */
export type AssistantAction =
  | { type: "navigate"; folder: "inbox" | "sent" }
  | { type: "filter"; filters: MailFilters }
  | { type: "open"; messageId: string }
  | { type: "compose"; draft: ComposeDraft }
  | { type: "reply"; body: string }
  | { type: "clarify"; message: string };
