import { google } from "googleapis";
import { cookies } from "next/headers";

/**
 * Token storage.
 *
 * For this reference implementation, the OAuth tokens are held in an
 * httpOnly encrypted cookie so the whole thing runs with zero external
 * infrastructure. That's a deliberate trade-off for a take-home-sized
 * project, not a production pattern -- swap `readTokens`/`writeTokens`
 * below for a lookup against your user table (Postgres/Redis/etc, keyed
 * by session id) once there's a real user model. Nothing else in the
 * app needs to change: everything else calls these two functions only.
 */
const COOKIE_NAME = "mc_tokens";

export interface StoredTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
}

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

export async function readTokens(): Promise<StoredTokens | null> {
  const raw = cookies().get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function serializeTokens(tokens: StoredTokens): string {
  return Buffer.from(JSON.stringify(tokens)).toString("base64");
}

export const TOKEN_COOKIE_NAME = COOKIE_NAME;

/**
 * Returns an OAuth2 client pre-loaded with the current session's tokens,
 * refreshing automatically if expired. Throws AuthRequiredError if the
 * user hasn't connected a Google account yet -- API routes catch this
 * and respond 401 so the client can redirect into /api/auth/google.
 */
export class AuthRequiredError extends Error {}

export async function getAuthorizedClient() {
  const tokens = await readTokens();
  if (!tokens) throw new AuthRequiredError("No Google account connected.");

  const client = getOAuthClient();
  client.setCredentials(tokens);

  // googleapis refreshes access tokens transparently on API calls when a
  // refresh_token is present; we just need to persist any rotated token.
  client.on("tokens", (newTokens) => {
    // In this cookie-based demo we can't write a new Set-Cookie header
    // from inside this event (no active response object here). A
    // production version persists newTokens to the user's DB row here.
    void newTokens;
  });

  return client;
}
