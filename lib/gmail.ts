import { gmail_v1, google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";
import type { MailFilters, MailMessage } from "@/types/mail";

/**
 * Every Gmail API call in the app goes through this file. Nothing in
 * app/api/** or components/** imports `googleapis` directly -- that
 * keeps the provider swappable (Microsoft Graph would be a second
 * implementation of this same interface) and keeps auth/parsing
 * concerns in one place.
 */

function client(auth: OAuth2Client): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth });
}

/** Builds a Gmail search query string from our typed filters. */
function buildQuery(folder: "inbox" | "sent", filters: MailFilters = {}): string {
  const parts = [folder === "inbox" ? "in:inbox" : "in:sent"];
  if (filters.sender) parts.push(`from:${filters.sender}`);
  if (filters.keyword) parts.push(filters.keyword);
  if (filters.unreadOnly) parts.push("is:unread");
  if (filters.sinceDays) parts.push(`newer_than:${filters.sinceDays}d`);
  return parts.join(" ");
}

function decodeBody(payload?: gmail_v1.Schema$MessagePart): string {
  if (!payload) return "";
  const findPart = (part: gmail_v1.Schema$MessagePart): string | null => {
    if (part.mimeType === "text/plain" && part.body?.data) {
      return Buffer.from(part.body.data, "base64").toString("utf8");
    }
    for (const child of part.parts || []) {
      const found = findPart(child);
      if (found) return found;
    }
    return null;
  };
  return findPart(payload) || "";
}

function header(payload: gmail_v1.Schema$MessagePart | undefined, name: string): string {
  return (
    payload?.headers?.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value || ""
  );
}

function toMailMessage(
  msg: gmail_v1.Schema$Message,
  folder: "inbox" | "sent"
): MailMessage {
  const payload = msg.payload;
  return {
    id: msg.id!,
    threadId: msg.threadId!,
    from: header(payload, "From"),
    to: header(payload, "To"),
    subject: header(payload, "Subject") || "(no subject)",
    snippet: msg.snippet || "",
    body: decodeBody(payload),
    date: new Date(Number(msg.internalDate)).toISOString(),
    isRead: !(msg.labelIds || []).includes("UNREAD"),
    folder,
  };
}

export async function listMessages(
  auth: OAuth2Client,
  folder: "inbox" | "sent",
  filters: MailFilters = {},
  maxResults = 25
): Promise<MailMessage[]> {
  const gmail = client(auth);
  const q = buildQuery(folder, filters);
  const { data } = await gmail.users.messages.list({ userId: "me", q, maxResults });
  if (!data.messages?.length) return [];

  // Gmail's list endpoint returns ids only; batch-fetch full messages.
  // For >25 results, prefer gmail.users.messages.batchGet or paginate
  // rather than growing this Promise.all indefinitely.
  const full = await Promise.all(
    data.messages.map((m) =>
      gmail.users.messages.get({ userId: "me", id: m.id!, format: "full" })
    )
  );
  return full.map((r) => toMailMessage(r.data, folder));
}

export async function getMessage(
  auth: OAuth2Client,
  id: string,
  folder: "inbox" | "sent"
): Promise<MailMessage> {
  const gmail = client(auth);
  const { data } = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  return toMailMessage(data, folder);
}

function buildRawMessage(to: string, subject: string, body: string, inReplyTo?: string): string {
  const headers = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset="UTF-8"`,
  ];
  if (inReplyTo) headers.push(`In-Reply-To: ${inReplyTo}`, `References: ${inReplyTo}`);
  const raw = `${headers.join("\r\n")}\r\n\r\n${body}`;
  return Buffer.from(raw).toString("base64url");
}

export async function sendMessage(
  auth: OAuth2Client,
  to: string,
  subject: string,
  body: string,
  opts?: { threadId?: string; inReplyToMessageId?: string }
): Promise<{ id: string; threadId: string }> {
  const gmail = client(auth);
  const raw = buildRawMessage(to, subject, body, opts?.inReplyToMessageId);
  const { data } = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw, threadId: opts?.threadId },
  });
  return { id: data.id!, threadId: data.threadId! };
}

/**
 * Registers (or renews) a Gmail push-notification watch. Gmail sends
 * a Pub/Sub message to the configured topic whenever the mailbox
 * changes; watches expire after ~7 days, so this should be re-run on
 * a daily cron. See README "Real-time sync" for the full flow.
 */
export async function startWatch(auth: OAuth2Client) {
  const gmail = client(auth);
  const { data } = await gmail.users.watch({
    userId: "me",
    requestBody: {
      topicName: process.env.GOOGLE_PUBSUB_TOPIC,
      labelIds: ["INBOX"],
    },
  });
  return data; // { historyId, expiration }
}

/**
 * Called after a Pub/Sub push notification arrives. Gmail's push
 * payload only contains a historyId, not the changed messages -- you
 * have to diff history yourself to find out what actually changed.
 */
export async function getHistorySince(auth: OAuth2Client, startHistoryId: string) {
  const gmail = client(auth);
  const { data } = await gmail.users.history.list({
    userId: "me",
    startHistoryId,
    historyTypes: ["messageAdded"],
  });
  return data.history?.flatMap((h) => h.messagesAdded?.map((m) => m.message?.id!) || []) || [];
}
