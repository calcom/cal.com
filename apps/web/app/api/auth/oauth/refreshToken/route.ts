import process from "node:process";
import { OAUTH_TOKEN_EXPIRY } from "@calcom/features/oauth/lib/constants";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { OAuthService } from "@calcom/features/oauth/services/OAuthService";
import prisma from "@calcom/prisma";
import type { OAuthTokenPayload } from "@calcom/types/oauth";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * @deprecated Use POST /api/auth/oauth/token with grant_type=refresh_token instead.
 * This endpoint is maintained for backwards compatibility.
 */
async function handler(req: NextRequest) {
  const { client_id, client_secret, grant_type, refresh_token } = await parseUrlFormData(req);

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  if (!client_id) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (grant_type !== "refresh_token") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const oAuthClientRepository = new OAuthClientRepository(prisma);

  const client = await oAuthClientRepository.findByClientId(client_id);

  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  const isValidClient = OAuthService.validateClient(client, client_secret);

  if (!isValidClient) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;

  let decodedRefreshToken: OAuthTokenPayload;

  try {
    const refreshTokenValue = refresh_token || req.headers.get("authorization")?.split(" ")[1] || "";

    if (!refreshTokenValue) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    decodedRefreshToken = jwt.verify(refreshTokenValue, secretKey, {
      algorithms: ["HS256"],
    }) as OAuthTokenPayload;
  } catch {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  if (decodedRefreshToken.clientId !== client_id) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

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
    algorithm: "HS256",
    expiresIn: OAUTH_TOKEN_EXPIRY.ACCESS_TOKEN,
  });

  const refresh_token_new = jwt.sign(payloadRefreshToken, secretKey, {
    algorithm: "HS256",
    expiresIn: OAUTH_TOKEN_EXPIRY.REFRESH_TOKEN,
  });

  return NextResponse.json(
    {
      access_token,
      token_type: "bearer",
      refresh_token: refresh_token_new,
      expires_in: OAUTH_TOKEN_EXPIRY.ACCESS_TOKEN,
    },
    {
      status: 200,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Cache-Control": "no-store",
        Pragma: "no-cache",
        Deprecation: "true",
        Link: '</api/auth/oauth/token>; rel="successor-version"',
      },
    }
  );
}

export const POST = defaultResponderForAppDir(handler);
