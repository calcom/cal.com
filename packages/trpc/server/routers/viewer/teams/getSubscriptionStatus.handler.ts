import { getTeamBillingServiceFactory } from "@calcom/ee/billing/di/containers/Billing";
import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { getMembershipRepository } from "@calcom/features/di/containers/MembershipRepository";
import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { HighWaterMarkRepository } from "@calcom/features/ee/billing/repository/highWaterMark/HighWaterMarkRepository";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
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
    return {
      status: null,
      isTrialing: false,
      billingMode: null,
      billingPeriod: null,
      currentMembers: null,
      highWaterMark: null,
      highWaterMarkPeriodStart: null,
      paidSeats: null,
    };
  }

  const { teamId } = input;

  const membershipRepository = getMembershipRepository();
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

    const billingPeriodService = new BillingPeriodService();
    const billingInfo = await billingPeriodService.getBillingPeriodInfo(teamId);

    log.debug(`Subscription status for team ${teamId}: ${subscriptionStatus}`);

    let currentMembers: number | null = null;
    let highWaterMark: number | null = null;
    let highWaterMarkPeriodStart: string | null = null;
    let paidSeats: number | null = null;

    if (billingInfo.billingPeriod === "MONTHLY" && !billingInfo.isInTrial) {
      const hwmRepo = new HighWaterMarkRepository();
      const hwmRecord = await hwmRepo.getByTeamId(teamId);
      if (hwmRecord) {
        highWaterMark = hwmRecord.highWaterMark;
        highWaterMarkPeriodStart = hwmRecord.highWaterMarkPeriodStart?.toISOString() ?? null;
        paidSeats = hwmRecord.paidSeats;
        currentMembers = await prisma.membership.count({ where: { teamId } });
      }
    }

    return {
      status: subscriptionStatus,
      isTrialing: subscriptionStatus === SubscriptionStatus.TRIALING,
      billingMode: billingInfo.billingMode,
      billingPeriod: billingInfo.billingPeriod,
      currentMembers,
      highWaterMark,
      highWaterMarkPeriodStart,
      paidSeats,
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
