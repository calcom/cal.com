import { getActiveUserBillingService } from "@calcom/features/ee/billing/active-user/di/ActiveUserBillingService.container";
import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetActiveUserBookingsInputSchema } from "./getActiveUserBookings.schema";

const log = logger.getSubLogger({ prefix: ["getActiveUserBookings"] });

type GetActiveUserBookingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetActiveUserBookingsInputSchema;
};

export const getActiveUserBookingsHandler = async ({ ctx, input }: GetActiveUserBookingsOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    return null;
  }

  const { teamId, userId, activeAs } = input;

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
      message: "Only team owners and admins can view active user bookings",
    });
  }

  try {
    const targetMembership = await membershipRepository.findUniqueByUserIdAndTeamId({
      userId,
      teamId,
    });

    if (!targetMembership || !targetMembership.accepted) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Target user is not a member of this team",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (!targetUser) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Target user not found",
      });
    }

    const billingPeriodService = new BillingPeriodService();
    const billingInfo = await billingPeriodService.getOrCreateBillingPeriodInfo(teamId);

    if (
      billingInfo.billingMode !== "ACTIVE_USERS" ||
      !billingInfo.subscriptionStart ||
      !billingInfo.subscriptionEnd
    ) {
      return null;
    }

    const activeUserBillingService = getActiveUserBillingService();
    const bookings = await activeUserBillingService.getBookingsForUser(
      userId,
      targetUser.email,
      activeAs,
      billingInfo.subscriptionStart,
      billingInfo.subscriptionEnd
    );

    return {
      bookings: bookings.map((b) => ({
        id: b.id,
        uid: b.uid,
        title: b.title,
        startTime: b.startTime.toISOString(),
        endTime: b.endTime.toISOString(),
        otherParty: b.otherParty,
      })),
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    log.error("Error getting active user bookings", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get active user bookings",
    });
  }
};

export default getActiveUserBookingsHandler;
