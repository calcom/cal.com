import { z } from "zod";

import prisma from "@calcom/prisma";

const TTL_MS = 5 * 60 * 1000; // 5 minutes – same as the old unstable_cache revalidate
let cached: Record<string, number> | null = null;
let cachedAt = 0;

const fetchInstallCounts = async (): Promise<Record<string, number>> => {
  const mostPopularApps = z.array(z.object({ appId: z.string(), installCount: z.number() })).parse(
    await prisma.$queryRaw`
    SELECT
      c."appId",
      COUNT(*)::integer AS "installCount"
    FROM
      "Credential" c
    WHERE
      c."appId" IS NOT NULL
    GROUP BY
      c."appId"
    ORDER BY
      "installCount" DESC
    `
  );
  return mostPopularApps.reduce(
    (acc, { appId, installCount }) => {
      acc[appId] = installCount;
      return acc;
    },
    {} as Record<string, number>
  );
};

const getInstallCountPerApp = async (): Promise<Record<string, number>> => {
  const now = Date.now();
  if (cached && now - cachedAt < TTL_MS) return cached;
  cached = await fetchInstallCounts();
  cachedAt = now;
  return cached;
};

export default getInstallCountPerApp;

/** @internal test-only – resets the module-level TTL cache */
export function _resetCache() {
  cached = null;
  cachedAt = 0;
}
