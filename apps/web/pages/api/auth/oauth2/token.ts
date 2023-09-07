import jwt from "jsonwebtoken";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import { generateSecret } from "@calcom/trpc/server/routers/viewer/oAuth/addClient.handler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ message: "Invalid method" });
    return;
  }

  const { code, client_id, client_secret, grant_type, redirect_uri } = req.body;

  if (grant_type !== "authorization_code") {
    return res.status(400).json({ message: "grant_type invalid" });
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
    return res.status(401).json({ message: "Unauthorized" });
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

  if (!accessCode) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // can I use the CALENDSO_ENCRYPTION_KEY here?
  const secretKey = process.env.CALENDSO_ENCRYPTION_KEY;

  const payload = {
    userId: accessCode.userId,
    //scope:
  };

  const access_token = jwt.sign(payload, secretKey, {
    // expiresIn: "1h",  // implement refresh token endpoint first
  });

  res.status(200).json({ access_token });
}
