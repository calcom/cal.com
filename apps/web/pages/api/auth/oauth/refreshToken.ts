import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  const { refresh_token, client_id, client_secret, grant_type } = req.body;

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

  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;

  const decodedRefreshToken = jwt.verify(refresh_token, secretKey);

  if (!decodedRefreshToken || decodedRefreshToken.token_type !== "Refresh Token") {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const payload = {
    userId: decodedRefreshToken.userId,
    scope: decodedRefreshToken.scope,
    token_type: "Access Token",
  };

  const access_token = jwt.sign(payload, secretKey, {
    expiresIn: 1800, // 30 min
  });

  res.status(200).json({ access_token });
}
