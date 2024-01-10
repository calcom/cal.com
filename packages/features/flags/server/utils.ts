import type { PrismaClient } from "@calcom/prisma";

import type { AppFlags } from "../config";

const FLAGSMITH_ENVIRONMENT_ID = process.env.FLAGSMITH_ENVIRONMENT_ID;

async function getFlagsmithFlags() {
  const response = await fetch(`https://edge.api.flagsmith.com/api/v1/flags/`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "x-environment-key": FLAGSMITH_ENVIRONMENT_ID,
    },
  });
  return await response.json();
}

export async function getFeatureFlagMap(prisma: PrismaClient) {
  if (!!FLAGSMITH_ENVIRONMENT_ID) {
    const flags = await getFlagsmithFlags();
    const res = flags.reduce<AppFlags>((acc, flag) => {
      acc[flag.feature.name as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as AppFlags);
    return res;
  } else {
    const flags = await prisma.feature.findMany({
      orderBy: { slug: "asc" },
      cacheStrategy: { swr: 300, ttl: 300 },
    });
    return flags.reduce<AppFlags>((acc, flag) => {
      acc[flag.slug as keyof AppFlags] = flag.enabled;
      return acc;
    }, {} as AppFlags);
  }
}
