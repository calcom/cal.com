import { getActiveUserBillingService } from "@calcom/features/ee/billing/active-user/di/ActiveUserBillingService.container";
import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetActiveUserBreakdownInputSchema } from "./getActiveUserBreakdown.schema";

const log = logger.getSubLogger({ prefix: ["getActiveUserBreakdown"] });

type GetActiveUserBreakdownOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetActiveUserBreakdownInputSchema;
};

export const getActiveUserBreakdownHandler = async ({ ctx, input }: GetActiveUserBreakdownOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    return null;
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
      message: "Only team owners and admins can view active user breakdown",
    });
  }

  try {
    const billingPeriodService = new BillingPeriodService();
    const billingInfo = await billingPeriodService.getOrCreateBillingPeriodInfo(teamId);

    if (billingInfo.billingMode !== "ACTIVE_USERS") {
      return null;
    }

    if (!billingInfo.subscriptionStart || !billingInfo.subscriptionEnd) {
      return null;
    }

    const activeUserBillingService = getActiveUserBillingService();
    const breakdown = await activeUserBillingService.getActiveUsersForOrg(
      teamId,
      billingInfo.subscriptionStart,
      billingInfo.subscriptionEnd
    );

    return {
      activeUsers: breakdown.activeUsers,
      totalMembers: breakdown.totalMembers,
      activeHosts: breakdown.activeHosts,
      activeAttendees: breakdown.activeAttendees,
      periodStart: billingInfo.subscriptionStart.toISOString(),
      periodEnd: billingInfo.subscriptionEnd.toISOString(),
      pricePerSeat: billingInfo.pricePerSeat,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    log.error("Error getting active user breakdown", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get active user breakdown",
    });
  }
};

export default getActiveUserBreakdownHandler;
