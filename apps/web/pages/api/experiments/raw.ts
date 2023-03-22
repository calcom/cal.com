import cache from "memory-cache";
import type { NextApiRequest, NextApiResponse } from "next";
import postgres from "postgres";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const cacheKey = "experiment.prisma";
  const memory = cache.get(cacheKey);
  if (!memory) {
    cache.put(cacheKey, new Date());
  }
  const sql = postgres(process.env.DATABASE_URL || "");
  const [result] = await sql<Array<{ totalUSers?: number }>>`SELECT COUNT(id) as totalUsers FROM users`;
  res.json({ ...result, coldStart: !Boolean(memory) });
}
