"use client";

import { useMailState } from "@/hooks/useMailState";
import { Sidebar } from "@/components/Sidebar";
import { FilterBar } from "@/components/FilterBar";
import { MessageList } from "@/components/MessageList";
import { MessageDetail } from "@/components/MessageDetail";
import { ComposeForm } from "@/components/ComposeForm";
import { AssistantPanel } from "@/components/AssistantPanel";

export function MailApp() {
  const m = useMailState();

  if (m.authRequired) {
    return (
      <div className="connect-screen">
        <h1>Postbox</h1>
        <p>Connect your Google account to get started.</p>
        <a className="btn primary" href="/api/auth/google">
          Connect Gmail
        </a>
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar folder={m.folder} onSelectFolder={m.setFolder} onCompose={() => m.startCompose({})} />

      <div className="col">
        <FilterBar filters={m.filters} onChange={m.setFilters} />
        {m.loading ? <div className="empty-note">Loading...</div> : (
          <MessageList messages={m.messages} selectedId={m.openMessage?.id} onSelect={m.openById} />
        )}
      </div>

      <div className="col main-col">
        {m.compose ? (
          <ComposeForm
            draft={m.compose}
            onChange={m.setCompose}
            onSend={m.send}
            onDiscard={() => m.setCompose(null)}
          />
        ) : m.openMessage ? (
          <MessageDetail
            message={m.openMessage}
            onReply={() =>
              m.startCompose({
                to: m.openMessage!.from,
                subject: `Re: ${m.openMessage!.subject}`,
                body: "",
                inReplyToMessageId: m.openMessage!.id,
                threadId: m.openMessage!.threadId,
              })
            }
          />
        ) : (
          <div className="empty-note">Select a message, or ask the assistant to open one.</div>
        )}
      </div>

      <AssistantPanel log={m.assistantLog} onCommand={m.runCommand} />
    </div>
  );
}
