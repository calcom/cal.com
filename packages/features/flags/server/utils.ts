import type { Session } from "next-auth";

import getFlagsFromFlagsmith from "@calcom/features/flags/flagsmith/getFlagsFromFlagsmith";
import type { PrismaClient } from "@calcom/prisma";

import type { AppFlags } from "../config";

const FLAGSMITH_ENVIRONMENT_ID = process.env.FLAGSMITH_ENVIRONMENT_ID;

async function getFlagsFromDb(prisma: PrismaClient) {
  const flags = await prisma.feature.findMany({
    orderBy: { slug: "asc" },
    cacheStrategy: { swr: 300, ttl: 300 },
  });
  return flags.reduce((acc, flag) => {
    acc[flag.slug as keyof AppFlags] = flag.enabled;
    return acc;
  }, {} as AppFlags);
}

export async function getFeatureFlagMap(prisma: PrismaClient, user?: Session["user"]): Promise<AppFlags> {
  if (!!FLAGSMITH_ENVIRONMENT_ID) {
    try {
      const flags = await getFlagsFromFlagsmith(user);
      const res = flags.reduce<AppFlags>((acc, flag) => {
        acc[flag.feature.name as keyof AppFlags] = flag.enabled;
        return acc;
      }, {} as AppFlags);
      return res;
    } catch (error) {
      return await getFlagsFromDb(prisma);
    }
  } else {
    return await getFlagsFromDb(prisma);
  }
}
