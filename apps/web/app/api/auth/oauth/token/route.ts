
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const { code, client_id, client_secret, grant_type, redirect_uri, refresh_token: inputRefreshToken } = await parseUrlFormData(req);
  
  if (grant_type !== "authorization_code" && grant_type !== "refresh_token") {
    return NextResponse.json(
      { error: "unsupported_grant_type", error_description: "Grant type must be 'authorization_code' or 'refresh_token'" },
      { status: 400, headers: NO_STORE_HEADERS }
    );
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

  // Handle refresh token flow
  if (grant_type === "refresh_token") {
    if (!client) {
      return NextResponse.json(
        { error: "invalid_client", error_description: "Client authentication failed" },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;
    
    if (!secretKey) {
      return NextResponse.json({ message: "Server misconfiguration" }, { status: 500, headers: NO_STORE_HEADERS });
    }

    let decodedRefreshToken: OAuthTokenPayload;

    try {
      decodedRefreshToken = jwt.verify(inputRefreshToken, secretKey, { algorithms: ["HS256"] }) as OAuthTokenPayload;
    } catch {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Invalid or expired refresh token" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Token is not a valid refresh token" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    // Bind refresh token to requesting client for security
    if (decodedRefreshToken.clientId !== client_id) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Refresh token was not issued to this client" },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const payloadAuthToken: OAuthTokenPayload = {
      userId: decodedRefreshToken.userId,
      teamId: decodedRefreshToken.teamId,
      scope: decodedRefreshToken.scope,
      token_type: "Access Token",
      clientId: client_id,
    };

    const payloadNewRefreshToken: OAuthTokenPayload = {
      userId: decodedRefreshToken.userId,
      teamId: decodedRefreshToken.teamId,
      scope: decodedRefreshToken.scope,
      token_type: "Refresh Token",
      clientId: client_id,
    };

    const access_token = jwt.sign(payloadAuthToken, secretKey, {
      expiresIn: 1800, // 30 min
    });

    // Generate new refresh token with shorter expiry for better security
    const refresh_token = jwt.sign(payloadNewRefreshToken, secretKey, {
      expiresIn: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for security)
    });

    return NextResponse.json({ 
      access_token, 
      refresh_token,
      token_type: "Bearer",
      expires_in: 1800, // 30 minutes in seconds
      scope: decodedRefreshToken.scope || ""
    }, { status: 200, headers: NO_STORE_HEADERS });
  }

  // Handle authorization code flow
  if (!client || client.redirectUri !== redirect_uri) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
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
    return NextResponse.json({ message: "Unauthorized" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;
  
  if (!secretKey) {
    return NextResponse.json({ message: "Server misconfiguration" }, { status: 500, headers: NO_STORE_HEADERS });
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
  };

  const access_token = jwt.sign(payloadAuthToken, secretKey, {
    expiresIn: 1800, // 30 min
  });

  const refresh_token = jwt.sign(payloadRefreshToken, secretKey, {
    expiresIn: 7 * 24 * 60 * 60, // 7 days (reduced from 30 for security)
  });

  return NextResponse.json({ 
    access_token, 
    refresh_token,
    token_type: "Bearer",
    expires_in: 1800, // 30 minutes in seconds
    scope: accessCode.scopes || ""
  }, { status: 200, headers: NO_STORE_HEADERS });
}

export const POST = defaultResponderForAppDir(handler);
