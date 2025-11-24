import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const { client_id, client_secret, grant_type, refresh_token } = await parseUrlFormData(req);

  if (!client_id) {
    return NextResponse.json({ message: "Missing client_id" }, { status: 400 });
  }

  if (grant_type !== "refresh_token") {
    return NextResponse.json({ message: "grant_type invalid" }, { status: 400 });
  }

  // First, find the client to determine client type
  const client = await prisma.oAuthClient.findFirst({
    where: {
      clientId: client_id,
    },
    select: {
      redirectUri: true,
      clientSecret: true,
      clientType: true,
    },
  });

  if (!client) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // Handle authentication based on client type
  if (client.clientType === "CONFIDENTIAL") {
    // Confidential client - requires client secret
    if (!client_secret) {
      return NextResponse.json(
        { message: "client_secret required for confidential clients" },
        { status: 400 }
      );
    }

    const [hashedSecret] = generateSecret(client_secret);
    if (client.clientSecret !== hashedSecret) {
      return NextResponse.json({ message: "Invalid client_secret" }, { status: 401 });
    }
  }
  // Public clients don't need client_secret validation

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    return NextResponse.json({ message: "CALENDSO_ENCRYPTION_KEY is not set" }, { status: 500 });
  }
  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;

  let decodedRefreshToken: OAuthTokenPayload;

  try {
    // Try to get refresh token from form data first (standard), then from Authorization header
    const refreshTokenValue = refresh_token || req.headers.get("authorization")?.split(" ")[1] || "";

    if (!refreshTokenValue) {
      return NextResponse.json({ message: "Missing refresh_token" }, { status: 400 });
    }

    decodedRefreshToken = jwt.verify(refreshTokenValue, secretKey) as OAuthTokenPayload;
  } catch {
    return NextResponse.json({ message: "Invalid refresh_token" }, { status: 401 });
  }

  if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
    return NextResponse.json({ message: "Invalid refresh_token" }, { status: 401 });
  }

  // Verify the refresh token was issued for this client
  if (decodedRefreshToken.clientId !== client_id) {
    return NextResponse.json({ message: "Invalid refresh_token" }, { status: 401 });
  }

  const accessTokenExpiresIn = 1800; // 30 minutes

  const payloadAuthToken: OAuthTokenPayload = {
    userId: decodedRefreshToken.userId,
    teamId: decodedRefreshToken.teamId,
    scope: decodedRefreshToken.scope,
    token_type: "Access Token",
    clientId: client_id,
  };

  const payloadRefreshToken: OAuthTokenPayload = {
    userId: decodedRefreshToken.userId,
    teamId: decodedRefreshToken.teamId,
    scope: decodedRefreshToken.scope,
    token_type: "Refresh Token",
    clientId: client_id,
  };

  const access_token = jwt.sign(payloadAuthToken, secretKey, {
    expiresIn: accessTokenExpiresIn,
  });

  const refresh_token_new = jwt.sign(payloadRefreshToken, secretKey, {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
  });

  return NextResponse.json(
    {
      access_token,
      token_type: "bearer",
      refresh_token: refresh_token_new,
      expires_in: accessTokenExpiresIn,
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
      },
    }
  );
}

export const POST = defaultResponderForAppDir(handler);
