import { publicProcedure, router } from "@calcom/trpc/server/trpc";

export const featureFlagRouter = router({
  // Fetch contract `name` and `symbol` or error
  list: publicProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;

    return prisma.feature.findMany();
  }),
});
