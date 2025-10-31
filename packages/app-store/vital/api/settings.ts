import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET" && req.session && req.session.user.id) {
    const userId = req.session.user.id;
    try {
      const user = await prisma.user.findFirst({
        select: {
          metadata: true,
        },
        where: {
          id: userId,
        },
      });

      if (user && user.metadata && (user.metadata as Prisma.JsonObject)?.vitalSettings) {
        res.status(200).json((user.metadata as Prisma.JsonObject).vitalSettings);
      } else {
        res.status(404);
      }
    } catch {
      res.status(500);
    }
  } else {
    res.status(400);
  }
  res.end();
}
