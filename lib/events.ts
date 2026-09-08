/**
 * Bridges the Gmail Pub/Sub webhook (server-side, fires once per push
 * notification) to any open browser tabs (client-side, listening via
 * EventSource) so the inbox updates without a manual refresh.
 *
 * This in-memory EventEmitter is fine for a single Node process /
 * take-home-sized deployment. For multiple server instances behind a
 * load balancer, replace this with a real pub/sub backbone (Redis
 * pub/sub, or the same Google Pub/Sub topic fanned out again) so an
 * event received by instance A reaches a browser connected to
 * instance B. Nothing in app/api/events or components/MailApp needs
 * to change if you do that -- they only depend on subscribe/publish.
 */
import { EventEmitter } from "events";

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export function publishNewMail(messageIds: string[]) {
  emitter.emit("new-mail", { messageIds, at: new Date().toISOString() });
}

export function subscribe(onEvent: (data: { messageIds: string[]; at: string }) => void) {
  emitter.on("new-mail", onEvent);
  return () => emitter.off("new-mail", onEvent);
}
