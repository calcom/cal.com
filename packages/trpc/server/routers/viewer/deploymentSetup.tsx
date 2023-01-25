import { DeploymentLicenseType } from "@prisma/client";
import { z } from "zod";

import prisma from "@calcom/prisma";

import { router, authedProcedure } from "../../trpc";

export const deploymentSetupRouter = router({
  update: authedProcedure
    .input(
      z.object({
        licenseType: z.nativeEnum(DeploymentLicenseType).optional(),
        licenseKey: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const data = {
        licenseConsentAt: new Date(),
        ...(input.licenseType ? { licenseType: input.licenseType } : {}),
        ...(input.licenseKey ? { licenseKey: input.licenseKey } : {}),
      };

      await prisma.deployment.upsert({ where: { id: 1 }, create: data, update: data });

      return;
    }),
});
