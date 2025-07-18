import * as cache from "memory-cache";
import { z } from "zod";

import prisma from "@calcom/prisma";

const CACHE_KEY = "app:install-counts";
const CACHE_TTL_MS = 5 * 60 * 1000;

const getInstallCountPerApp = async (): Promise<Record<string, number>> => {
  const cached = cache.get(CACHE_KEY) as Record<string, number> | null;

  if (cached) {
    return cached;
  }

  const installCounts = await computeInstallCountsFromDB();

  cache.put(CACHE_KEY, installCounts, CACHE_TTL_MS);

  return installCounts;
};

const computeInstallCountsFromDB = async (): Promise<Record<string, number>> => {
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
  return mostPopularApps.reduce((acc, { appId, installCount }) => {
    acc[appId] = installCount;
    return acc;
  }, {} as Record<string, number>);
};

export default getInstallCountPerApp;
export { computeInstallCountsFromDB };
