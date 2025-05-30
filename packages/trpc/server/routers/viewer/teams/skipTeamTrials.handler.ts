import { InternalTeamBilling } from "@calcom/ee/billing/teams/internal-team-billing";
import { IS_SELF_HOSTED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { TeamRepository } from "@calcom/lib/server/repository/team";
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
    const { success, ownedTeams, error } = await TeamRepository.skipTeamTrials({
      userId: ctx.user.id,
    });

    if (!success || !ownedTeams) {
      log.error("Error skipping team trials", error);
      return { success: false, error: error || "Failed to skip team trials" };
    }

    for (const team of ownedTeams) {
      const teamBillingService = new InternalTeamBilling(team);

      const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

      if (subscriptionStatus === "trialing") {
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
