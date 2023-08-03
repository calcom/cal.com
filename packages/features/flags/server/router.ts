import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { getFeatureFlagMap } from "./utils";

export const featureFlagRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    return prisma.feature.findMany({
      orderBy: { slug: "asc" },
    });
  }),
  map: publicProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    return getFeatureFlagMap(prisma);
  }),
});
