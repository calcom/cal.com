import { z } from "zod";

import prisma from "@calcom/prisma";

import { router, authedProcedure } from "../../trpc";

export const deploymentSetupRouter = router({
  update: authedProcedure
    .input(
      z.object({
        licenseKey: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const data = {
        licenseConsentAt: new Date(),
        ...(input.licenseKey ? { licenseKey: input.licenseKey } : {}),
      };

      await prisma.deployment.upsert({ where: { id: 1 }, create: data, update: data });

      return;
    }),
});
