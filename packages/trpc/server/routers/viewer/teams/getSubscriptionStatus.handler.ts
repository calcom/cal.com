import {
  getBillingProviderService,
  getTeamBillingServiceFactory,
} from "@calcom/ee/billing/di/containers/Billing";
import { SubscriptionStatus } from "@calcom/ee/billing/repository/billing/IBillingRepository";
import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";
import { teamMetadataStrictSchema } from "@calcom/prisma/zod-utils";
import { TRPCError } from "@trpc/server";
import isNil from "lodash/isNil";
import type { TrpcSessionUser } from "../../../types";
import type { TGetSubscriptionStatusInputSchema } from "./getSubscriptionStatus.schema";
import { hasScheduledCancellation } from "./hasScheduledCancellation";

const log = logger.getSubLogger({ prefix: ["getSubscriptionStatus"] });

type GetSubscriptionStatusOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetSubscriptionStatusInputSchema;
};

export const getSubscriptionStatusHandler = async ({ ctx, input }: GetSubscriptionStatusOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    return { status: null, isTrialing: false, billingMode: null };
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
    const isTrialing = subscriptionStatus === SubscriptionStatus.TRIALING;
    const parsedMetadata = teamMetadataStrictSchema.safeParse(team.metadata);
    const subscriptionId = parsedMetadata.success ? parsedMetadata.data?.subscriptionId : null;
    let subscription = null;

    if (isTrialing && !isNil(subscriptionId)) {
      try {
        subscription = await getBillingProviderService().getSubscription(subscriptionId);
      } catch (error) {
        log.error("Error getting trial cancellation details", error);
      }
    }

    const billingPeriodService = new BillingPeriodService();
    const billingInfo = await billingPeriodService.getBillingPeriodInfo(teamId);

    log.debug(`Subscription status for team ${teamId}: ${subscriptionStatus}`);

    return {
      status: subscriptionStatus,
      isTrialing,
      isCancellationScheduled: hasScheduledCancellation(subscription),
      billingMode: billingInfo.billingMode,
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
