import { NextRequest, NextResponse } from "next/server";
import { getAuthorizedClient, AuthRequiredError } from "@/lib/auth";
import { getMessage } from "@/lib/gmail";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthorizedClient();
    const folder = (req.nextUrl.searchParams.get("folder") as "inbox" | "sent") || "inbox";
    const message = await getMessage(auth, params.id, folder);
    return NextResponse.json({ message });
  } catch (err) {
    if (err instanceof AuthRequiredError) {
      return NextResponse.json({ error: "auth_required" }, { status: 401 });
    }
    console.error(err);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
