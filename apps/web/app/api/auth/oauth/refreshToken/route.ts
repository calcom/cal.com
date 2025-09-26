import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import { parseUrlFormData } from "app/api/parseRequestData";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";
import type { OAuthTokenPayload } from "@calcom/types/oauth";

async function handler(req: NextRequest) {
  const { client_id, client_secret, grant_type } = await parseUrlFormData(req);

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
  const refreshTokenRaw = req.headers.get("authorization")?.split(" ")[1] || "";

  try {
    decodedRefreshToken = jwt.verify(refreshTokenRaw, secretKey) as OAuthTokenPayload;
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  if (!decodedRefreshToken.clientId || decodedRefreshToken.clientId !== client_id) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const decodedRaw = jwt.decode(refreshTokenRaw);
  const presentedJti =
    decodedRaw && typeof decodedRaw === "object" ? (decodedRaw as { jti?: string }).jti : undefined;
  if (!presentedJti) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const subjectKey = decodedRefreshToken.userId
    ? `user:${decodedRefreshToken.userId}`
    : `team:${decodedRefreshToken.teamId}`;

  const session = await prisma.oAuthRefreshSession.findUnique({
    where: { clientId_subjectKey: { clientId: client_id, subjectKey } },
  });

  if (!session || session.expiresAt <= new Date() || session.currentJti !== presentedJti) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payloadAccessToken: OAuthTokenPayload = {
    userId: decodedRefreshToken.userId,
    teamId: decodedRefreshToken.teamId,
    scope: decodedRefreshToken.scope,
    token_type: "Access Token",
    clientId: decodedRefreshToken.clientId,
  };

  const payloadRefreshToken: OAuthTokenPayload = {
    userId: decodedRefreshToken.userId,
    teamId: decodedRefreshToken.teamId,
    scope: decodedRefreshToken.scope,
    token_type: "Refresh Token",
    clientId: decodedRefreshToken.clientId,
  };

  const access_token = jwt.sign(payloadAccessToken, secretKey, {
    expiresIn: 1800, // 30 min
  });

  const newJti = uuidv4();
  const sessionExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await prisma.oAuthRefreshSession.update({
    where: { clientId_subjectKey: { clientId: client_id, subjectKey } },
    data: { currentJti: newJti, expiresAt: sessionExpiresAt },
  });

  const refresh_token = jwt.sign(payloadRefreshToken, secretKey, {
    expiresIn: 365 * 24 * 60 * 60, // 1 year
    jwtid: newJti,
  });

  return NextResponse.json({ access_token, refresh_token }, { status: 200 });
}

export const POST = defaultResponderForAppDir(handler);
