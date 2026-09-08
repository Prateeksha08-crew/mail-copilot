"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantAction, ComposeDraft, MailFilters, MailMessage } from "@/types/mail";

/**
 * This hook is the single place UI state lives and changes. Both the
 * ordinary UI (clicking a folder, typing in a filter box) and the
 * assistant (resolved actions from /api/assistant) call the exact same
 * functions here -- applyAction() at the bottom just pattern-matches an
 * AssistantAction onto these same setters. That's what guarantees the
 * assistant can never do something the UI itself couldn't: there is
 * only one code path that mutates state.
 */
export function useMailState() {
  const [folder, setFolder] = useState<"inbox" | "sent">("inbox");
  const [filters, setFilters] = useState<MailFilters>({});
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [openMessage, setOpenMessage] = useState<MailMessage | null>(null);
  const [compose, setCompose] = useState<ComposeDraft | null>(null);
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [assistantLog, setAssistantLog] = useState<
    { role: "user" | "assistant" | "action"; text: string }[]
  >([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ folder });
    if (filters.sender) params.set("sender", filters.sender);
    if (filters.keyword) params.set("keyword", filters.keyword);
    if (filters.unreadOnly) params.set("unreadOnly", "true");
    if (filters.sinceDays) params.set("sinceDays", String(filters.sinceDays));

    const res = await fetch(`/api/gmail/messages?${params}`);
    if (res.status === 401) {
      setAuthRequired(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setMessages(data.messages || []);
    setLoading(false);
  }, [folder, filters]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time sync: listen for the pubsub-driven SSE stream and refetch
  // the visible list when new mail arrives, instead of polling.
  useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === "new-mail" && folder === "inbox") refresh();
    };
    return () => source.close();
  }, [folder, refresh]);

  const openById = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/gmail/message/${id}?folder=${folder}`);
      const data = await res.json();
      setOpenMessage(data.message);
      setCompose(null);
    },
    [folder]
  );

  const startCompose = useCallback((draft: Partial<ComposeDraft>) => {
    setCompose({ to: "", subject: "", body: "", ...draft });
    setOpenMessage(null);
  }, []);

  const send = useCallback(async () => {
    if (!compose) return;
    await fetch("/api/gmail/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(compose),
    });
    setCompose(null);
    setFolder("sent");
  }, [compose]);

  const logRef = useRef(assistantLog);
  logRef.current = assistantLog;

  const runCommand = useCallback(
    async (command: string) => {
      setAssistantLog((l) => [...l, { role: "user", text: command }]);

      const context = {
        currentFolder: folder,
        openMessage,
        visibleMessages: messages.map((m) => ({
          id: m.id,
          from: m.from,
          to: m.to,
          subject: m.subject,
          date: m.date,
          isRead: m.isRead,
        })),
        today: new Date().toISOString(),
      };

      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, context }),
      });
      const { action } = (await res.json()) as { action: AssistantAction };
      await applyAction(action);
    },
    [folder, openMessage, messages]
  );

  async function applyAction(action: AssistantAction) {
    switch (action.type) {
      case "navigate":
        setFolder(action.folder);
        setAssistantLog((l) => [...l, { role: "action", text: `Switched to ${action.folder}.` }]);
        break;
      case "filter":
        setFilters((f) => ({ ...f, ...action.filters }));
        setAssistantLog((l) => [...l, { role: "action", text: `Filters updated.` }]);
        break;
      case "open":
        await openById(action.messageId);
        setAssistantLog((l) => [...l, { role: "action", text: `Opened message.` }]);
        break;
      case "compose":
        startCompose(action.draft);
        setAssistantLog((l) => [
          ...l,
          { role: "action", text: `Compose form filled -- review and click Send.` },
        ]);
        break;
      case "reply":
        if (!openMessage) {
          setAssistantLog((l) => [
            ...l,
            { role: "assistant", text: "Nothing is open to reply to right now." },
          ]);
          break;
        }
        startCompose({
          to: openMessage.from,
          subject: openMessage.subject.startsWith("Re:")
            ? openMessage.subject
            : `Re: ${openMessage.subject}`,
          body: action.body,
          inReplyToMessageId: openMessage.id,
          threadId: openMessage.threadId,
        });
        setAssistantLog((l) => [
          ...l,
          { role: "action", text: `Reply drafted -- review and click Send.` },
        ]);
        break;
      case "clarify":
        setAssistantLog((l) => [...l, { role: "assistant", text: action.message }]);
        break;
    }
  }

  return {
    folder,
    setFolder,
    filters,
    setFilters,
    messages,
    openMessage,
    compose,
    setCompose,
    loading,
    authRequired,
    assistantLog,
    openById,
    startCompose,
    send,
    runCommand,
    refresh,
  };
}
