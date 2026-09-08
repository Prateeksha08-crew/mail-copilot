import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedClient, AuthRequiredError } from "@/lib/auth";
import { listMessages } from "@/lib/gmail";
import type { MailFilters } from "@/types/mail";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthorizedClient();
    const sp = req.nextUrl.searchParams;
    const folder = (sp.get("folder") as "inbox" | "sent") || "inbox";
    const filters: MailFilters = {
      sender: sp.get("sender") || undefined,
      keyword: sp.get("keyword") || undefined,
      unreadOnly: sp.get("unreadOnly") === "true",
      sinceDays: sp.get("sinceDays") ? Number(sp.get("sinceDays")) : undefined,
    };

    const messages = await listMessages(auth, folder, filters);
    return NextResponse.json({ messages });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
