import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // User denied access
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "https://jobpilot-lime.vercel.app"}/settings?gmail=denied`,
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "https://jobpilot-lime.vercel.app"}/settings?gmail=error`,
    );
  }

  // Decode state to get userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
    if (!userId) throw new Error("no userId");
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "https://jobpilot-lime.vercel.app"}/settings?gmail=error`,
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || "https://jobpilot-lime.vercel.app/api/gmail/callback";

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    console.error("Gmail token exchange failed:", await tokenRes.text());
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "https://jobpilot-lime.vercel.app"}/settings?gmail=error`,
    );
  }

  const tokens = await tokenRes.json();
  const { access_token, refresh_token, expires_in } = tokens;

  // Fetch user's Gmail address
  const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!userInfoRes.ok) {
    console.error("Gmail userinfo fetch failed:", await userInfoRes.text());
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL || "https://jobpilot-lime.vercel.app"}/settings?gmail=error`,
    );
  }

  const userInfo = await userInfoRes.json();
  const email: string = userInfo.email;

  const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000);

  // Upsert GmailToken row
  await prisma.gmailToken.upsert({
    where: { userId },
    create: {
      userId,
      email,
      accessToken: access_token,
      refreshToken: refresh_token ?? "",
      expiresAt,
    },
    update: {
      email,
      accessToken: access_token,
      // Only overwrite refresh_token if a new one was issued (Google only sends it on first auth or re-consent)
      ...(refresh_token ? { refreshToken: refresh_token } : {}),
      expiresAt,
    },
  });

  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL || "https://jobpilot-lime.vercel.app"}/settings?gmail=connected`,
  );
}
