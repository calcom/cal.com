import { OAUTH_TOKEN_EXPIRY } from "@calcom/features/oauth/lib/constants";
import { AccessCodeRepository } from "@calcom/features/oauth/repositories/AccessCodeRepository";
import { OAuthClientRepository } from "@calcom/features/oauth/repositories/OAuthClientRepository";
import { OAuthService } from "@calcom/features/oauth/services/OAuthService";
import prisma from "@calcom/prisma";
import type { OAuthTokenPayload } from "@calcom/types/oauth";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

function isValidRedirectUri(
  redirectUri: string,
  clientRedirectUri: string,
  clientRedirectUris: string[]
): boolean {
  // Use redirectUris array if it has items, otherwise fall back to single redirectUri
  if (clientRedirectUris.length > 0) {
    return clientRedirectUris.includes(redirectUri);
  }
  return clientRedirectUri === redirectUri;
}

function createTokenResponse(access_token: string, refresh_token: string) {
  return NextResponse.json(
    { access_token, token_type: "bearer", refresh_token, expires_in: OAUTH_TOKEN_EXPIRY.ACCESS_TOKEN },
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

async function handleAuthorizationCode(
  client_id: string,
  client_secret: string | undefined,
  code: string,
  redirect_uri: string,
  code_verifier: string | undefined,
  secretKey: string
) {
  const oAuthClientRepository = new OAuthClientRepository(prisma);
  const accessCodeRepository = new AccessCodeRepository(prisma);

  const client = await oAuthClientRepository.findByClientId(client_id);

  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  if (!isValidRedirectUri(redirect_uri, client.redirectUri, client.redirectUris)) {
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

  const access_token = jwt.sign(payloadAuthToken, secretKey, {
    algorithm: "HS256",
    expiresIn: OAUTH_TOKEN_EXPIRY.ACCESS_TOKEN,
  });

  const refresh_token = jwt.sign(payloadRefreshToken, secretKey, {
    algorithm: "HS256",
    expiresIn: OAUTH_TOKEN_EXPIRY.REFRESH_TOKEN,
  });

  return createTokenResponse(access_token, refresh_token);
}

async function handleRefreshToken(
  client_id: string,
  client_secret: string | undefined,
  refresh_token: string | undefined,
  authHeader: string | null,
  secretKey: string
) {
  const oAuthClientRepository = new OAuthClientRepository(prisma);

  const client = await oAuthClientRepository.findByClientId(client_id);

  if (!client) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  const isValidClient = OAuthService.validateClient(client, client_secret);

  if (!isValidClient) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }

  let decodedRefreshToken: OAuthTokenPayload;

  try {
    const refreshTokenValue = refresh_token || authHeader?.split(" ")[1] || "";

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

  return createTokenResponse(access_token, refresh_token_new);
}

async function handler(req: NextRequest) {
  const { code, client_id, client_secret, grant_type, redirect_uri, code_verifier, refresh_token } =
    await parseUrlFormData(req);

  if (!process.env.CALENDSO_ENCRYPTION_KEY) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;

  if (!client_id) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  if (grant_type === "authorization_code") {
    if (!code || !redirect_uri) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    return handleAuthorizationCode(client_id, client_secret, code, redirect_uri, code_verifier, secretKey);
  }

  if (grant_type === "refresh_token") {
    return handleRefreshToken(
      client_id,
      client_secret,
      refresh_token,
      req.headers.get("authorization"),
      secretKey
    );
  }

  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
}

export const POST = defaultResponderForAppDir(handler);
