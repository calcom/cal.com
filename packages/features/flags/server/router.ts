import type { NextApiRequest } from "next";

import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { getFeatureFlagMap } from "./utils";

export const featureFlagRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    return prisma.feature.findMany({
      orderBy: { slug: "asc" },
      cacheStrategy: { swr: 300, ttl: 300 },
    });
  }),
  map: publicProcedure.query(async ({ ctx }) => {
    return getFeatureFlagMap(ctx.req as NextApiRequest);
  }),
});
