// GET /api/auth/gmail/check — returns 200 if OAuth is configured, 503 if not
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
