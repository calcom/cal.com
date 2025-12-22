import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AccessCodeRepository } from "@calcom/features/oauth/repositories/AccessCodeRepository";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { OAuthService } from "@calcom/features/oauth/services/OAuthService";
import prisma from "@calcom/prisma";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const { code, client_id, client_secret, grant_type, redirect_uri, code_verifier } = await parseUrlFormData(
    req
  );

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    return NextResponse.json({ message: "CALENDSO_ENCRYPTION_KEY is not set" }, { status: 500 });
  }

  if (!client_id || !code || !redirect_uri) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (grant_type !== "authorization_code") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const oAuthClientRepository = new OAuthClientRepository(prisma);
  const accessCodeRepository = new AccessCodeRepository(prisma);

  const client = await oAuthClientRepository.findByClientId(client_id);

  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  if (client.redirectUri !== redirect_uri) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const isValidClient = OAuthService.validateClient(client, client_secret);

  if (!isValidClient) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  const accessCode = await accessCodeRepository.findValidCode(code, client_id);

  // Delete all expired accessCodes + the one that is used here
  await accessCodeRepository.deleteExpiredAndUsedCodes(code, client_id);

  if (!accessCode) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
  }

  const pkceError = OAuthService.verifyPKCE(client, accessCode, code_verifier);
  if (pkceError) {
    return NextResponse.json({ error: pkceError.error }, { status: pkceError.status });
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;

  const payloadAuthToken: OAuthTokenPayload = {
    userId: accessCode.userId,
    teamId: accessCode.teamId,
    scope: accessCode.scopes,
    token_type: "Access Token",
    clientId: client_id,
  };

  const payloadRefreshToken: OAuthTokenPayload = {
    userId: accessCode.userId,
    teamId: accessCode.teamId,
    scope: accessCode.scopes,
    token_type: "Refresh Token",
    clientId: client_id,
    // Include PKCE information for clients that used PKCE (PUBLIC mandatory, CONFIDENTIAL optional)
    ...(accessCode.codeChallenge && {
      codeChallenge: accessCode.codeChallenge,
      codeChallengeMethod: accessCode.codeChallengeMethod,
    }),
  };

  const accessTokenExpiresIn = 1800; // 30 minutes

  const access_token = jwt.sign(payloadAuthToken, secretKey, {
    expiresIn: accessTokenExpiresIn,
  });

  const refresh_token = jwt.sign(payloadRefreshToken, secretKey, {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
  });

  return NextResponse.json(
    { access_token, token_type: "bearer", refresh_token, expires_in: accessTokenExpiresIn },
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
