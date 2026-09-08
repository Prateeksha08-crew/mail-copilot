import { NextRequest, NextResponse } from "next/server";
import { getOAuthClient, serializeTokens, TOKEN_COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/?error=missing_code", req.url));
  }

  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);

  const res = NextResponse.redirect(new URL("/", req.url));
  res.cookies.set(TOKEN_COOKIE_NAME, serializeTokens(tokens as any), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
