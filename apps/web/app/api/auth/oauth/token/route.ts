import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  if (grant_type !== "authorization_code") {
    return NextResponse.json({ message: "grant_type invalid" }, { status: 400 });
  }

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

  if (!client || client.redirectUri !== redirect_uri) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const validationError = OAuthService.validateClient(client, client_secret, code_verifier);
  if (validationError) {
    return validationError;
  }

  const accessCode = await prisma.accessCode.findFirst({
    where: {
      code: code,
      clientId: client_id,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      userId: true,
      teamId: true,
      scopes: true,
      codeChallenge: true,
      codeChallengeMethod: true,
    },
  });

  // Delete all expired accessCodes + the one that is used here
  await prisma.accessCode.deleteMany({
    where: {
      OR: [
        {
          expiresAt: {
            lt: new Date(),
          },
        },
        {
          code: code,
          clientId: client_id,
        },
      ],
    },
  });

  if (!accessCode) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const pkceError = OAuthService.verifyPKCE(client, accessCode, code_verifier);
  if (pkceError) {
    return pkceError;
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
