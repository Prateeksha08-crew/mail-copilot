"use client";

import type { ComposeDraft } from "@/types/mail";

export function ComposeForm({
  draft,
  onChange,
  onSend,
  onDiscard,
}: {
  draft: ComposeDraft;
  onChange: (d: ComposeDraft) => void;
  onSend: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="pane">
      <h2>{draft.inReplyToMessageId ? "Reply" : "New message"}</h2>
      <div className="field">
        <label>To</label>
        <input value={draft.to} onChange={(e) => onChange({ ...draft, to: e.target.value })} />
      </div>
      <div className="field">
        <label>Subject</label>
        <input value={draft.subject} onChange={(e) => onChange({ ...draft, subject: e.target.value })} />
      </div>
      <div className="field">
        <label>Body</label>
        <textarea value={draft.body} onChange={(e) => onChange({ ...draft, body: e.target.value })} />
      </div>
      <div className="action-row">
        {/* Sending always requires this explicit click, whether the assistant or
            the user filled the form -- there is no code path that sends mail
            without it. */}
        <button className="btn primary" onClick={onSend}>
          Send
        </button>
        <button className="btn" onClick={onDiscard}>
          Discard
        </button>
      </div>
    </div>
  );
}
