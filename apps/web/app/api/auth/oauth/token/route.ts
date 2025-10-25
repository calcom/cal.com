import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const { code, client_id, client_secret, grant_type, redirect_uri, refresh_token } = await parseUrlFormData(
    req
  );

  if (!client_id || !client_secret) {
    return NextResponse.json({ message: "Missing client id or secret" }, { status: 400 });
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

  if (!client || (grant_type === "authorization_code" && client.redirectUri !== redirect_uri)) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY || "";

  if (grant_type === "authorization_code") {
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
      expiresIn: 30 * 24 * 60 * 60, // 30 days
    });

    return NextResponse.json({ access_token, refresh_token }, { status: 200 });
  } else if (grant_type === "refresh_token") {
    if (!refresh_token) {
      return NextResponse.json({ message: "Missing refresh_token" }, { status: 400 });
    }

    let decodedRefreshToken: OAuthTokenPayload;
    try {
      decodedRefreshToken = jwt.verify(refresh_token, secretKey) as OAuthTokenPayload;
    } catch {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const payload: OAuthTokenPayload = {
      userId: decodedRefreshToken.userId,
      teamId: decodedRefreshToken.teamId,
      scope: decodedRefreshToken.scope,
      token_type: "Access Token",
      clientId: client_id,
    };

    const access_token = jwt.sign(payload, secretKey, {
      expiresIn: 1800, // 30 min
    });

    const new_refresh_token = jwt.sign(
      {
        ...payload,
        token_type: "Refresh Token",
      },
      secretKey,
      { expiresIn: 30 * 24 * 60 * 60 }
    );

    return NextResponse.json({ access_token, refresh_token: new_refresh_token }, { status: 200 });
  } else {
    return NextResponse.json({ message: "grant_type invalid" }, { status: 400 });
  }
}

export const POST = defaultResponderForAppDir(handler);
