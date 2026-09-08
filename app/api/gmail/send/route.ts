import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedClient, AuthRequiredError } from "@/lib/auth";
import { sendMessage } from "@/lib/gmail";

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthorizedClient();
    const { to, subject, body, threadId, inReplyToMessageId } = await req.json();

    if (!to || typeof to !== "string") {
      return NextResponse.json({ error: "A recipient is required." }, { status: 400 });
    }

    const result = await sendMessage(auth, to, subject || "(no subject)", body || "", {
      threadId,
      inReplyToMessageId,
    });
    return NextResponse.json({ sent: result });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
