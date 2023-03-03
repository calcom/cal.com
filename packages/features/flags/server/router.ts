import { z } from "zod";

import { authedAdminProcedure, publicProcedure, router } from "@calcom/trpc/server/trpc";

export const featureFlagRouter = router({
  list: publicProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    return prisma.feature.findMany({
      orderBy: { slug: "asc" },
    });
  }),
  map: publicProcedure.query(async ({ ctx }) => {
    const { prisma } = ctx;
    const flags = await prisma.feature.findMany({
      orderBy: { slug: "asc" },
    });
    return flags.reduce<Record<string, boolean>>((fs, f) => {
      fs[f.slug] = f.enabled;
      return fs;
    }, {});
  }),
  isEnabled: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const { prisma } = ctx;
    const feature = await prisma.feature.findUnique({
      where: { slug: input },
      select: { enabled: true },
    });
    return feature?.enabled ?? false;
  }),
  toggle: authedAdminProcedure
    .input(z.object({ slug: z.string(), enabled: z.boolean() }))
    .mutation(({ ctx, input }) => {
      const { prisma, user } = ctx;
      const { slug, enabled } = input;
      return prisma.feature.update({
        where: { slug },
        data: { enabled, updatedBy: user.id },
      });
    }),
});
