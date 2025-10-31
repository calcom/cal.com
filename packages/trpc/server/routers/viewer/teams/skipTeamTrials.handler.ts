import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { BillingRepositoryFactory } from "@calcom/ee/billing/repository/billing/billingRepositoryFactory";
import { TeamBillingDataRepositoryFactory } from "@calcom/ee/billing/repository/teamBillingData/teamBillingDataRepositoryFactory";
import { TeamBillingServiceFactory } from "@calcom/ee/billing/service/teams/teamBillingServiceFactory";
import { BillingProviderServiceFactory } from "@calcom/features/ee/billing/service/billingProvider/billingProviderServiceFactory";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_SELF_HOSTED, IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { TSkipTeamTrialsInputSchema } from "./skipTeamTrials.schema";

const log = logger.getSubLogger({ prefix: ["skipTeamTrials"] });

type SkipTeamTrialsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSkipTeamTrialsInputSchema;
};

export const skipTeamTrialsHandler = async ({ ctx }: SkipTeamTrialsOptions) => {
  // If self-hosted, no need to skip trials as they're already handled differently
  if (IS_SELF_HOSTED) return { success: true };

  try {
    await prisma.user.update({
      where: {
        id: ctx.user.id,
      },
      data: {
        trialEndsAt: null,
      },
    });

    const ownedTeams = await MembershipRepository.findAllAcceptedTeamMemberships(ctx.user.id, {
      role: "OWNER",
    });

    for (const team of ownedTeams) {
      const teamBillingDataRepository =
        TeamBillingDataRepositoryFactory.getRepository(IS_TEAM_BILLING_ENABLED);
      const billingRepository = BillingRepositoryFactory.getRepository(
        team.isOrganization,
        IS_TEAM_BILLING_ENABLED
      );
      const billingProviderService = BillingProviderServiceFactory.getService();

      const teamBillingServiceFactory = new TeamBillingServiceFactory({
        billingProviderService,
        teamBillingDataRepository,
        billingRepository,
        isTeamBillingEnabled: IS_TEAM_BILLING_ENABLED,
      });

      const teamBillingService = teamBillingServiceFactory.init(team);

      const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

      if (subscriptionStatus === SubscriptionStatus.TRIALING) {
        await teamBillingService.endTrial();
        log.info(`Ended trial for team ${team.id}`);
      }
    }

    return { success: true };
  } catch (error) {
    log.error("Error skipping team trials", error);
    return { success: false, error: "Failed to skip team trials" };
  }
};

export default skipTeamTrialsHandler;
