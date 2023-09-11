import type { PrismaClient } from "@calcom/prisma";

import type { AppFlags } from "../config";

export async function getFeatureFlagMap(prisma: PrismaClient) {
  const flags = await prisma.feature.findMany({
    orderBy: { slug: "asc" },
  });
  return flags.reduce<AppFlags>((acc, flag) => {
    acc[flag.slug as keyof AppFlags] = flag.enabled;
    return acc;
  }, {} as AppFlags);
}

export const checkFeatureFlag = async (flagName: keyof AppFlags) => {
  const prisma = await import("@calcom/prisma").then((mod) => mod.default);
  const flags = await getFeatureFlagMap(prisma);

  if (flags[flagName] === false) {
    return {
      notFound: true,
    };
  }

  return {
    props: {},
  };
};
