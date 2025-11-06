import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const form = await req.formData();

  const client_id = form.get("client_id") as string | null
  const client_secret = form.get("client_secret") as string | null
  const grant_type = form.get("grant_type") as string | null

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

  let decodedRefreshToken: OAuthTokenPayload;

  try {
    const refreshToken = req.headers.get("authorization")?.split(" ")[1] || "";
    decodedRefreshToken = jwt.verify(refreshToken, secretKey) as OAuthTokenPayload;
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
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
    expiresIn: 1800, // 30 min
  });

  const refresh_token = jwt.sign(payloadRefreshToken, secretKey, {
    expiresIn: 30 * 24 * 60 * 60, // 30 days
  });

  return NextResponse.json({ access_token, refresh_token }, { status: 200 });
}

export const POST = defaultResponderForAppDir(handler);
