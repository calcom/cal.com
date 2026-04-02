import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { TeamRepository } from "@calcom/features/ee/teams/repositories/TeamRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
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

  const membershipRepository = new MembershipRepository();
  const membership = await membershipRepository.findUniqueByUserIdAndTeamId({
    userId: ctx.user.id,
    teamId,
  });

  if (!membership || !membership.accepted) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of this team",
    });
  }

  try {
    const teamRepository = new TeamRepository(prisma);
    const team = await teamRepository.findById({ id: teamId });

    if (!team) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team not found",
      });
    }

    const permissionService = new PermissionCheckService();
    const hasManageBillingPermission = await permissionService.checkPermission({
      userId: ctx.user.id,
      teamId,
      permission: team.isOrganization ? "organization.manageBilling" : "team.manageBilling",
      fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
    });

    if (!hasManageBillingPermission) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only team owners and admins can skip the trial",
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
