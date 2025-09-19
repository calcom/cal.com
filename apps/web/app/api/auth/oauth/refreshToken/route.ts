import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const { client_id, client_secret, grant_type } = await parseUrlFormData(req);

  if (!client_id || !client_secret) {
    return NextResponse.json({ message: "Missing client id or secret" }, { status: 400 });
  }

  if (grant_type !== "refresh_token") {
    return NextResponse.json({ message: "grant type invalid" }, { status: 400 });
  }

  const [hashedSecret] = generateSecret(client_secret);

  const client = await prisma.oAuthClient.findFirst({
    where: {
      clientId: client_id,
      clientSecret: hashedSecret,
    },
    select: {
      redirectUri: true,
    },
  });

  if (!client) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY || "";

  let decodedRefreshToken: OAuthTokenPayload | null = null;

  try {
    const refreshToken = req.headers.get("authorization")?.split(" ")[1] || "";
    decodedRefreshToken = jwt.verify(refreshToken, secretKey) as OAuthTokenPayload;
  } catch (err) {
    // If the token is expired, allow a short grace period to refresh.
    // This enables clients to recover even if they attempt refresh slightly after expiry.
    // IMPORTANT: We only allow this if the token is otherwise valid (decodable) and within grace window.
    const isExpired = (err as Error & { name?: string }).name === "TokenExpiredError";
    if (!isExpired) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const refreshToken = req.headers.get("authorization")?.split(" ")[1] || "";
    const decoded = jwt.decode(refreshToken) as (OAuthTokenPayload & { exp?: number }) | null;
    if (!decoded) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // 7-day grace period by default
    const REFRESH_GRACE_SECONDS = 7 * 24 * 60 * 60;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const exp = decoded.exp ?? 0;
    if (exp === 0 || nowSeconds - exp > REFRESH_GRACE_SECONDS) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
    decodedRefreshToken = decoded;
  }

  if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Ensure the refresh token was issued for the same client that is attempting to use it.
  if (decodedRefreshToken.clientId !== client_id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Issue a new short-lived access token.
  const accessPayload: OAuthTokenPayload = {
    userId: decodedRefreshToken.userId,
    teamId: decodedRefreshToken.teamId,
    scope: decodedRefreshToken.scope,
    token_type: "Access Token",
    clientId: client_id,
  };

  const access_token = jwt.sign(accessPayload, secretKey, {
    expiresIn: 1800, // 30 min
  });

  // Rotate refresh token: issue a brand-new refresh token so clients can continue beyond the current token's lifetime.
  const refreshPayload: OAuthTokenPayload = {
    userId: decodedRefreshToken.userId,
    teamId: decodedRefreshToken.teamId,
    scope: decodedRefreshToken.scope,
    token_type: "Refresh Token",
    clientId: client_id,
  };

  const refresh_token = jwt.sign(refreshPayload, secretKey, {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
  });

  return NextResponse.json({ access_token, refresh_token }, { status: 200 });
}

export const POST = defaultResponderForAppDir(handler);

// Export a testable handler for unit tests without affecting the runtime POST export
export { handler as refreshTokenHandler };
