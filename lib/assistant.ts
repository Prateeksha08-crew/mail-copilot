import Anthropic from "@anthropic-ai/sdk";
import type { AssistantAction, MailMessage } from "@/types/mail";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * This is the entire "AI controls the UI" mechanism. We don't ask Claude
 * to describe what to do in prose and then regex-parse it -- we give it
 * a tool definition that mirrors AssistantAction exactly, force tool
 * choice, and take its tool_use input as the action verbatim. That
 * removes an entire class of bugs (mismatched wording, partial JSON,
 * hallucinated fields) that a "reply in JSON" prompt is prone to.
 */
const ACTION_TOOL: Anthropic.Tool = {
  name: "ui_action",
  description:
    "Perform exactly one action against the mail client UI in response to the user's command.",
  input_schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["navigate", "filter", "open", "compose", "reply", "clarify"],
      },
      folder: { type: "string", enum: ["inbox", "sent"], description: "for type=navigate" },
      filters: {
        type: "object",
        description: "for type=filter",
        properties: {
          sender: { type: "string" },
          keyword: { type: "string" },
          unreadOnly: { type: "boolean" },
          sinceDays: { type: "number" },
        },
      },
      messageId: { type: "string", description: "for type=open; must be an id from the provided message list" },
      draft: {
        type: "object",
        description: "for type=compose",
        properties: {
          to: { type: "string" },
          subject: { type: "string" },
          body: { type: "string" },
        },
      },
      body: { type: "string", description: "for type=reply" },
      message: { type: "string", description: "for type=clarify" },
    },
    required: ["type"],
  },
};

export interface AssistantContext {
  currentFolder: "inbox" | "sent";
  openMessage: MailMessage | null;
  visibleMessages: Pick<MailMessage, "id" | "from" | "to" | "subject" | "date" | "isRead">[];
  today: string; // ISO date, so the model can resolve "last 10 days" etc.
}

export async function resolveCommand(
  command: string,
  context: AssistantContext
): Promise<AssistantAction> {
  const system = `You are a copilot embedded in a mail client. You resolve the user's
natural-language command into exactly one UI action using the ui_action tool.

Rules:
- "open the latest from X" / "the email about Y" -> resolve against
  context.visibleMessages and return type "open" with that message's id.
  Never invent an id that isn't in the list.
- Relative time phrases ("last 10 days", "this week") -> convert to a
  "sinceDays" number in a "filter" action, relative to context.today.
- "reply to this" / "respond" only makes sense if context.openMessage is
  set. If it's null, return type "clarify" asking what to reply to.
- If the command is genuinely ambiguous (e.g. two plausible matches),
  return type "clarify" rather than guessing.
- One action per call. Do not narrate outside the tool call.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 500,
    system,
    tools: [ACTION_TOOL],
    tool_choice: { type: "tool", name: "ui_action" },
    messages: [
      {
        role: "user",
        content: `Context: ${JSON.stringify(context)}\n\nCommand: "${command}"`,
      },
    ],
  });

  const toolUse = response.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
  );
  if (!toolUse) {
    return { type: "clarify", message: "I couldn't work out what to do with that." };
  }

  return normalizeAction(toolUse.input as Record<string, unknown>);
}

/** Reshapes the flat tool input back into the discriminated union in types/mail.ts. */
function normalizeAction(input: Record<string, unknown>): AssistantAction {
  switch (input.type) {
    case "navigate":
      return { type: "navigate", folder: input.folder as "inbox" | "sent" };
    case "filter":
      return { type: "filter", filters: (input.filters as Record<string, unknown>) || {} };
    case "open":
      return { type: "open", messageId: String(input.messageId) };
    case "compose":
      return { type: "compose", draft: input.draft as any };
    case "reply":
      return { type: "reply", body: String(input.body || "") };
    default:
      return { type: "clarify", message: String(input.message || "Could you clarify that?") };
  }
}
