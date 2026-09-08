"use client";

import { useState } from "react";

export function AssistantPanel({
  log,
  onCommand,
}: {
  log: { role: "user" | "assistant" | "action"; text: string }[];
  onCommand: (command: string) => Promise<void>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!text.trim() || busy) return;
    const command = text;
    setText("");
    setBusy(true);
    await onCommand(command);
    setBusy(false);
  };

  return (
    <div className="assistant">
      <div className="assistant-head">
        Assistant <span>· drives this UI</span>
      </div>
      <div className="hint">
        Try: &quot;send an email to sara@northline.io about the Q3 deck&quot;, &quot;show unread from
        the last 7 days&quot;, &quot;open the latest from David&quot;, or &quot;reply to this&quot;
        while reading a message.
      </div>
      <div className="assistant-log">
        {log.map((entry, i) => (
          <div key={i} className={`bubble ${entry.role}`}>
            {entry.text}
          </div>
        ))}
      </div>
      <div className="assistant-input">
        <input
          value={text}
          placeholder="Tell the assistant what to do..."
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit} disabled={busy}>
          Send
        </button>
      </div>
    </div>
  );
}
