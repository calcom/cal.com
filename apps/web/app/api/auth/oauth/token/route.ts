import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { parseAndValidateScopes } from "@calcom/features/auth/lib/scopeValidator";
import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const { code, client_id, client_secret, grant_type, redirect_uri } = await parseUrlFormData(req);
  if (grant_type !== "authorization_code") {
    return NextResponse.json({ message: "grant_type invalid" }, { status: 400 });
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

  if (!client || client.redirectUri !== redirect_uri) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const accessCode = await prisma.accessCode.findFirst({
    where: {
      code: code,
      clientId: client_id,
      expiresAt: {
        gt: new Date(),
      },
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

  const validationResult = parseAndValidateScopes(accessCode.scopes);
  if (!validationResult.success) {
    return NextResponse.json({ error: "invalid_grant" }, { status: 401 });
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY || "";

  const payloadAuthToken: OAuthTokenPayload = {
    userId: accessCode.userId,
    teamId: accessCode.teamId,
    scope: validationResult.scopes,
    token_type: "Access Token",
    clientId: client_id,
  };

  const payloadRefreshToken: OAuthTokenPayload = {
    userId: accessCode.userId,
    teamId: accessCode.teamId,
    scope: validationResult.scopes,
    token_type: "Refresh Token",
    clientId: client_id,
  };

  const accessTokenExpiresIn = 1800; // 30 minutes

  const access_token = jwt.sign(payloadAuthToken, secretKey, {
    expiresIn: accessTokenExpiresIn,
  });

  const refresh_token = jwt.sign(payloadRefreshToken, secretKey, {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
  });

  // @see https://datatracker.ietf.org/doc/html/rfc6749#section-5.1
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
