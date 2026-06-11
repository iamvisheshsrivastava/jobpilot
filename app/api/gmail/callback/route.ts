import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.NEXTAUTH_URL || "https://jobpilot-lime.vercel.app";

function redirectSettings(status: string) {
  return NextResponse.redirect(`${BASE_URL}/settings?gmail=${status}`);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) return redirectSettings("denied");
  if (!code || !state) return redirectSettings("error");

  // Decode state to get userId
  let userId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString());
    userId = decoded.userId;
    if (!userId) throw new Error("no userId in state");
  } catch (e) {
    console.error("[gmail/callback] state decode failed:", e);
    return redirectSettings("error");
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${BASE_URL}/api/gmail/callback`;

  if (!clientId || !clientSecret) {
    console.error("[gmail/callback] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET");
    return redirectSettings("error");
  }

  try {
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
      }).toString(),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error("[gmail/callback] token exchange failed:", tokenRes.status, body);
      return redirectSettings("error");
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in?: number;
    };
    const { access_token, refresh_token, expires_in } = tokens;

    // Fetch Gmail address
    const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!userInfoRes.ok) {
      const body = await userInfoRes.text();
      console.error("[gmail/callback] userinfo failed:", userInfoRes.status, body);
      return redirectSettings("error");
    }

    const userInfo = await userInfoRes.json() as { email: string };
    const email = userInfo.email;
    const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000);

    // Save tokens to DB
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
        ...(refresh_token ? { refreshToken: refresh_token } : {}),
        expiresAt,
      },
    });

    return redirectSettings("connected");
  } catch (e) {
    console.error("[gmail/callback] unhandled error:", e);
    return redirectSettings("error");
  }
}
