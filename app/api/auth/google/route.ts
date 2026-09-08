import { NextResponse } from "next/server";
import { getOAuthClient } from "@/lib/auth";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify", // needed to mark read, and for watch()
];

export async function GET() {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline", // required to receive a refresh_token
    prompt: "consent",
    scope: SCOPES,
  });
  return NextResponse.redirect(url);
}
