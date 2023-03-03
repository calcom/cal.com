import type { PrismaClient } from "@prisma/client";

export async function getFeatureFlagMap(prisma: PrismaClient) {
  const flags = await prisma.feature.findMany({
    orderBy: { slug: "asc" },
  });
  return flags.reduce<Record<string, boolean>>((fs, f) => {
    fs[f.slug] = f.enabled;
    return fs;
  }, {});
}
