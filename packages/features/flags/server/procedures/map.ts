import publicProcedure from "@calcom/trpc/server/procedures/publicProcedure";

import { getFeatureFlagMap } from "../utils";

export const map = publicProcedure.query(async ({ ctx }) => {
  const { prisma } = ctx;
  return getFeatureFlagMap(prisma);
});
