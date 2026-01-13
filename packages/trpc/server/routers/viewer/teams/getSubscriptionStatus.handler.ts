import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetSubscriptionStatusInputSchema } from "./getSubscriptionStatus.schema";

const log = logger.getSubLogger({ prefix: ["getSubscriptionStatus"] });

type GetSubscriptionStatusOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetSubscriptionStatusInputSchema;
};

export const getSubscriptionStatusHandler = async ({ ctx, input }: GetSubscriptionStatusOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    return { status: null, isTrialing: false };
  }

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

  const team = await TeamService.fetchTeamOrThrow(teamId);
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
      message: "Only team owners and admins can view subscription status",
    });
  }

  try {
    const teamBillingServiceFactory = getTeamBillingServiceFactory();
    const teamBillingService = await teamBillingServiceFactory.findAndInit(teamId);

    const subscriptionStatus = await teamBillingService.getSubscriptionStatus();

    log.debug(`Subscription status for team ${teamId}: ${subscriptionStatus}`);

    return {
      status: subscriptionStatus,
      isTrialing: subscriptionStatus === SubscriptionStatus.TRIALING,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    log.error("Error getting subscription status", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get subscription status",
    });
  }
};

export default getSubscriptionStatusHandler;
