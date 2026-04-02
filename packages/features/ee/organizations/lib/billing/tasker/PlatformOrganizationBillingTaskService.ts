import type { IBillingProviderService } from "@calcom/features/ee/billing/service/billingProvider/IBillingProviderService";
import type { OrganizationRepository } from "@calcom/features/ee/organizations/repositories/OrganizationRepository";
import type { PlatformBillingRepository } from "@calcom/features/ee/organizations/repositories/PlatformBillingRepository";
import type { ITaskerDependencies } from "@calcom/lib/tasker/types";
import type { PlatformOrganizationBillingTasks } from "./types";

export interface IPlatformOrganizationBillingTaskServiceDependencies {
  organizationRepository: OrganizationRepository;
  platformBillingRepository: PlatformBillingRepository;
  billingProviderService: Pick<IBillingProviderService, "createSubscriptionUsageRecord">;
}

export class PlatformOrganizationBillingTaskService implements PlatformOrganizationBillingTasks {
  constructor(
    public readonly dependencies: {
      logger: ITaskerDependencies["logger"];
    } & IPlatformOrganizationBillingTaskServiceDependencies
  ) {}

  async incrementUsage(
    payload: Parameters<PlatformOrganizationBillingTasks["incrementUsage"]>[0]
  ): Promise<void> {
    const { userId } = payload;
    const { organizationRepository, platformBillingRepository, billingProviderService, logger } =
      this.dependencies;

    const team = await organizationRepository.findPlatformOrgByUserId(userId);
    const teamId = team?.id;
    if (!teamId) {
      logger.error(`User (${userId}) is not part of the platform organization (${teamId})`, {
        teamId,
        userId,
      });
      return;
    }

    const billingSubscription = await platformBillingRepository.findByTeamId(teamId);
    if (!billingSubscription || !billingSubscription?.subscriptionId) {
      logger.error(`Team ${teamId} did not have stripe subscription associated to it`, {
        teamId,
      });
      return;
    }

    await billingProviderService.createSubscriptionUsageRecord({
      subscriptionId: billingSubscription.subscriptionId,
      action: "increment",
      quantity: 1,
    });

    logger.info("Increased organization usage for subscription", {
      subscriptionId: billingSubscription.subscriptionId,
      teamId,
      userId,
    });
  }
}
