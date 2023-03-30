import cache from "memory-cache";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cacheKey = "experiment";
  const memory = cache.get(cacheKey);
  if (!memory) {
    cache.put(cacheKey, new Date());
  }
  res.json({ coldStart: !Boolean(memory) });
}
