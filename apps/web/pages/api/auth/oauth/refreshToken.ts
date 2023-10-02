import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";
import type { OAuthTokenPayload } from "pages/api/auth/oauth/token";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  const refreshToken = req.headers.authorization?.split(" ")[1] || "";

  const { client_id, client_secret, grant_type } = req.body;

  if (grant_type !== "refresh_token") {
    res.status(400).json({ message: "grant type invalid" });
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

  if (!client) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY || "";

  let decodedRefreshToken: OAuthTokenPayload;

  try {
    decodedRefreshToken = jwt.verify(refreshToken, secretKey) as OAuthTokenPayload;
  } catch {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const payload: OAuthTokenPayload = {
    userId: decodedRefreshToken.userId,
    scope: decodedRefreshToken.scope,
    token_type: "Access Token",
    clientId: client_id,
  };

  const access_token = jwt.sign(payload, secretKey, {
    expiresIn: 1800, // 30 min
  });

  res.status(200).json({ access_token });
}
