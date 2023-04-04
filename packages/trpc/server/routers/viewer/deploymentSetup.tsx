import { z } from "zod";

import { router, authedAdminProcedure } from "../../trpc";

export const deploymentSetupRouter = router({
  update: authedAdminProcedure
    .input(
      z.object({
        licenseKey: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const data = {
        agreedLicenseAt: new Date(),
        licenseKey: input.licenseKey,
      };

      await ctx.prisma.deployment.upsert({ where: { id: 1 }, create: data, update: data });

      return;
    }),
});
