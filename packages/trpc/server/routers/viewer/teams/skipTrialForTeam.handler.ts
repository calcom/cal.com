import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TSkipTrialForTeamInputSchema } from "./skipTrialForTeam.schema";

const log = logger.getSubLogger({ prefix: ["skipTrialForTeam"] });

type SkipTrialForTeamOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSkipTrialForTeamInputSchema;
};

export const skipTrialForTeamHandler = async ({ ctx, input }: SkipTrialForTeamOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) return { success: true };

  const { teamId } = input;

  const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({
    userId: ctx.user.id,
    teamId,
  });

  if (!membership || !membership.accepted) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this team",
    });
  }

  if (membership.role !== MembershipRole.OWNER && membership.role !== MembershipRole.ADMIN) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only team owners and admins can skip the trial",
    });
  }

  try {
    const teams = await MembershipRepository.findAllAcceptedTeamMemberships(ctx.user.id, {
      role: "OWNER",
    });

    const team = teams.find((t) => t.id === teamId);

    if (!team) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team not found or you are not the owner",
      });
    }

    const teamBillingServiceFactory = getTeamBillingServiceFactory();
    const teamBillingService = teamBillingServiceFactory.init(team);

    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    if (subscriptionStatus !== SubscriptionStatus.TRIALING) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Team is not currently in trial",
      });
    }

    await teamBillingService.endTrial();
    log.info(`Ended trial for team ${teamId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    log.error("Error skipping trial for team", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to skip trial for team",
    });
  }
};

export default skipTrialForTeamHandler;
