import { Prisma } from "@prisma/client";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "PUT" && req.session && req.session.user.id) {
    const userId = req.session.user.id;
    try {
      const userWithMetadata = await prisma.user.findFirst({
        where: {
          id: req?.session?.user.id,
        },
        select: {
          id: true,
          metadata: true,
        },
      });

      await prisma.user.update({
        where: {
          id: req?.session?.user.id,
        },
        data: {
          metadata: {
            ...(userWithMetadata?.metadata as Prisma.JsonObject),
            vitalSettings: {
              ...(userWithMetadata?.metadata as Prisma.JsonObject),
              connected: true,
            },
          },
        },
      });

      if (vitalConfig && !!vitalConfig.key) {
        res.status(200).json(vitalConfig.key);
      } else {
        res.status(404);
      }
    } catch (error) {
      res.status(500);
    }
  } else {
    res.status(400);
  }
  res.end();
}
