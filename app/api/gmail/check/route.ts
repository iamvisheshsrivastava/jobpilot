// GET /api/gmail/check — returns 200 if Gmail OAuth is configured, 503 if not.
// Consolidated here under /api/gmail (alongside connect/callback/status/
// disconnect/sync) - this used to live at /api/auth/gmail/check, a stray
// duplicate route under a different namespace for no reason (issue #7).
import { NextResponse } from "next/server";

export async function GET() {
  const configured =
    !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_REDIRECT_URI;

  if (!configured) {
    return NextResponse.json(
      { error: "Google OAuth not configured." },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true });
}
