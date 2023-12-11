import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";

export type OAuthTokenPayload = {
  userId?: number | null;
  teamId?: number | null;
  token_type: string;
  scope: string[];
  clientId: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  const { code, client_id, client_secret, grant_type, redirect_uri } = req.body;

  if (grant_type !== "authorization_code") {
    res.status(400).json({ message: "grant_type invalid" });
    return;
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
    res.status(401).json({ message: "Unauthorized" });
    return;
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

  //delete all expired accessCodes + the one that is used here
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
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY || "";

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

  res.status(200).json({ access_token, refresh_token });
}
