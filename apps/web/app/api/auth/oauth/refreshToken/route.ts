import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { OAuthService } from "@calcom/features/oauth/services/OAuthService";
import prisma from "@calcom/prisma";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const { client_id, client_secret, grant_type, refresh_token } = await parseUrlFormData(req);

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    return NextResponse.json({ message: "CALENDSO_ENCRYPTION_KEY is not set" }, { status: 500 });
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

    decodedRefreshToken = jwt.verify(refreshTokenValue, secretKey) as OAuthTokenPayload;
  } catch {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  if (decodedRefreshToken.clientId !== client_id) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
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
