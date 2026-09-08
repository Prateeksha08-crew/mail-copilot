import { NextResponse } from "next/server";
import { getAuthorizedClient, AuthRequiredError } from "@/lib/auth";
import { startWatch } from "@/lib/gmail";

/**
 * Call this once after a user connects their Google account, and again
 * on a daily cron (Gmail watches expire after ~7 days -- see the
 * `expiration` field in the response). In production, persist the
 * returned historyId per-user so the Pub/Sub webhook has a starting
 * point to diff from.
 */
export async function POST() {
  try {
    const auth = await getAuthorizedClient();
    const result = await startWatch(auth);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
