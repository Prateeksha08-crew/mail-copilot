import { subscribe } from "@/lib/events";

export const dynamic = "force-dynamic";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));

      send({ type: "connected" });
      const unsubscribe = subscribe((event) => send({ type: "new-mail", ...event }));

      // Keep the connection alive through idle proxies/load balancers.
      const heartbeat = setInterval(() => send({ type: "heartbeat" }), 25000);

      // @ts-expect-error -- Next's ReadableStream lacks a signal cleanup hook by default
      controller.signal?.addEventListener?.("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
