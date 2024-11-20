import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiKey = req.headers.authorization || req.query.apiKey;
  if (![process.env.CRON_API_KEY, `Bearer ${process.env.CRON_SECRET}`].includes(`${apiKey}`)) {
    res.status(401).json({ message: "Not authenticated" });
    return;
  }

  const deleted = await prisma.calendarCache.deleteMany({
    where: {
      // Delete all cache entries that expired before now
      expiresAt: {
        lte: new Date(Date.now()),
      },
    },
  });

  res.json({ ok: true, count: deleted.count });
}
