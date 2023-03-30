import cache from "memory-cache";
import type { NextApiRequest, NextApiResponse } from "next";

import prisma from "@calcom/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cacheKey = "experiment";
  const memory = cache.get(cacheKey);
  if (!memory) {
    cache.put(cacheKey, new Date());
  }

  const totalUsers = await prisma.user.count();
  res.json({ totalUsers, coldStart: !Boolean(memory) });
}
