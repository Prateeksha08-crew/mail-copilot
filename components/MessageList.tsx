"use client";

import type { MailMessage } from "@/types/mail";

export function MessageList({
  messages,
  selectedId,
  onSelect,
}: {
  messages: MailMessage[];
  selectedId?: string;
  onSelect: (id: string) => void;
}) {
  if (!messages.length) {
    return <div className="empty-note">No messages match these filters.</div>;
  }

  return (
    <div>
      {messages.map((m) => (
        <div
          key={m.id}
          className={`msg-item ${!m.isRead ? "unread" : ""} ${selectedId === m.id ? "selected" : ""}`}
          onClick={() => onSelect(m.id)}
        >
          <div className="msg-from">
            <span>{m.folder === "inbox" ? m.from : m.to}</span>
            <span className="msg-date">{new Date(m.date).toLocaleDateString()}</span>
          </div>
          <div className="msg-subj">{m.subject}</div>
          <div className="msg-preview">{m.snippet}</div>
        </div>
      ))}
    </div>
  );
}
