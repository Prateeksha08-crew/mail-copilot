"use client";

import type { MailMessage } from "@/types/mail";

export function MessageDetail({
  message,
  onReply,
}: {
  message: MailMessage;
  onReply: () => void;
}) {
  return (
    <div className="pane">
      <h2>{message.subject}</h2>
      <div className="meta-row">
        <strong>{message.folder === "inbox" ? "From" : "To"}:</strong>{" "}
        {message.folder === "inbox" ? message.from : message.to}
      </div>
      <div className="meta-row">{new Date(message.date).toLocaleString()}</div>
      <div className="body-text">{message.body}</div>
      {message.folder === "inbox" && (
        <div className="action-row">
          <button className="btn primary" onClick={onReply}>
            Reply
          </button>
        </div>
      )}
    </div>
  );
}
