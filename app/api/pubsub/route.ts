import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedClient, AuthRequiredError } from "@/lib/auth";
import { getHistorySince } from "@/lib/gmail";
import { publishNewMail } from "@/lib/events";

/**
 * Google Pub/Sub POSTs here whenever the watched mailbox changes. The
 * payload is a base64-encoded JSON blob containing only { emailAddress,
 * historyId } -- Gmail deliberately doesn't tell you *what* changed, so
 * we diff history ourselves and only then know which message ids are new.
 *
 * Configure this URL as the push endpoint on your Pub/Sub subscription,
 * and set GOOGLE_PUBSUB_VERIFICATION_TOKEN as a query param on that
 * endpoint URL (?token=...) so we can reject spoofed requests -- Pub/Sub
 * push has no built-in auth beyond this shared-secret pattern (or full
 * OIDC token verification, which is the stronger option for production).
 */
export async function POST(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (token !== process.env.GOOGLE_PUBSUB_VERIFICATION_TOKEN) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const envelope = await req.json();
  const data = JSON.parse(Buffer.from(envelope.message?.data || "", "base64").toString("utf8"));
  const { historyId } = data as { emailAddress: string; historyId: string };

  try {
    const auth = await getAuthorizedClient();
    const newMessageIds = await getHistorySince(auth, historyId);
    if (newMessageIds.length) publishNewMail(newMessageIds);
  } catch (err) {
    if (!(err instanceof AuthRequiredError)) console.error(err);
    // Pub/Sub retries on non-2xx, so still ack even if we couldn't process
    // this one (e.g. token expired) to avoid a redelivery storm.
  }

  return NextResponse.json({ ok: true });
}
