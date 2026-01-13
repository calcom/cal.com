import { schemaTask } from "@trigger.dev/sdk";
import type { z } from "zod";

import { platformBillingTaskConfig } from "./config";
import { platformBillingTaskSchema } from "./schema";

export const incrementUsage = schemaTask({
  id: "platform.billing.increment-usage",
  ...platformBillingTaskConfig,
  schema: platformBillingTaskSchema,
  run: async (payload: z.infer<typeof platformBillingTaskSchema>) => {
    const { TriggerDevLogger } = await import("@calcom/lib/triggerDevLogger");
    const { prisma } = await import("@calcom/prisma");
    const { getBillingProviderService } = await import(
      "@calcom/features/ee/billing/di/containers/Billing"
    );
    const { OrganizationRepository } = await import(
      "@calcom/features/ee/organizations/repositories/OrganizationRepository"
    );
    const { PlatformBillingRepository } = await import(
      "@calcom/features/ee/organizations/repositories/PlatformBillingRepository"
    );
    const { PlatformOrganizationBillingTaskService } = await import(
      "../PlatformOrganizationBillingTaskService"
    );

    const triggerDevLogger = new TriggerDevLogger();
    const organizationRepository = new OrganizationRepository({ prismaClient: prisma });
    const platformBillingRepository = new PlatformBillingRepository(prisma);
    const billingProviderService = getBillingProviderService();

    const billingTaskService = new PlatformOrganizationBillingTaskService({
      logger: triggerDevLogger,
      organizationRepository,
      platformBillingRepository,
      billingProviderService,
    });

    await billingTaskService.incrementUsage(payload);
  },
});
