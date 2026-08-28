import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";

const SCOPES = [
  // NOTE: gmail.metadata must NOT be requested — when present, the Gmail API
  // rejects the 'q' search parameter and format=full with 403, breaking sync.
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || "https://jobpilot-lime.vercel.app/api/gmail/callback";

  if (!clientId) {
    return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
  }

  // Random, unguessable CSRF nonce - the callback verifies it against the
  // httpOnly cookie set below and takes the userId from the session, not
  // from the state param itself (cuid()s aren't secret, so embedding the
  // userId in state gave no real CSRF protection).
  const state = crypto.randomBytes(24).toString("base64url");
  cookies().set("gmail_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  // Remember which page to bounce back to (settings vs inbox both have their
  // own "gmail=connected" status handling) - defaults to settings.
  const next = new URL(req.url).searchParams.get("next") === "inbox" ? "inbox" : "settings";
  cookies().set("gmail_oauth_return", next, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 10 * 60,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  return NextResponse.redirect(authUrl);
}
