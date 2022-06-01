import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

import { getSession } from "@lib/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  req.session = await getSession({ req });
  if (req.method === "GET" && req.session && req.session.user.id && req.query) {
    const { "app-credential-type": slug } = req.query;

    if (!slug && Array.isArray(slug)) {
      return res.status(400);
    }

    const userId = req.session.user.id;
    try {
      const installedApp = await prisma.credential.findFirst({
        where: {
          appId: slug as string,
          userId: userId,
        },
      });

      if (installedApp && !!installedApp.key) {
        res.status(200);
      } else {
        res.status(404);
      }
    } catch (error) {
      console.log(error);
      res.status(500);
    }
  } else {
    res.status(400);
  }
  res.end();
}
