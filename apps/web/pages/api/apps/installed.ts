import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  req.session = await getSession({ req });
  if (req.method === "GET" && req.session && req.session.user.id && req.query) {
    const { "app-credential-type": appCredentialType } = req.query;
    if (!appCredentialType && Array.isArray(appCredentialType)) {
      return res.status(400);
    }

    const userId = req.session.user.id;
    try {
      const credentials = await prisma.credential.findMany({
        where: {
          type: appCredentialType as string,
          userId: userId,
        },
      });

      if (credentials && !!credentials.length) {
        res.json({ credentials });
      } else {
        res.json({ credentials: [] });
      }
    } catch (error) {
      console.log(error);
      res.status(500);
    }
  } else {
    res.json({ credentials: [] });
  }
  res.end();
}
