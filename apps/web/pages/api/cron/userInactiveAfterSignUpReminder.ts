import type { NextApiRequest, NextApiResponse } from "next";

import { defaultHandler } from "@calcom/lib/server";
import prisma from "@calcom/prisma";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  //   if (process.env.CRON_API_KEY !== apiKey) {
  //     res.status(401).json({ message: "Not authenticated" });
  //     return;
  //   }

  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const users = await prisma.user.findMany({
    where: {
      createdDate: {
        lt: twoWeeksAgo,
      },
      bookings: {
        none: {},
      },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
  console.log("USER", users);
  //   if()

  res.status(200).json({ users });
}

export default defaultHandler({
  POST: Promise.resolve({ default: handler }),
});
