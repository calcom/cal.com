import { BillingPeriodService } from "@calcom/features/ee/billing/service/billingPeriod/BillingPeriodService";
import { TeamService } from "@calcom/features/ee/teams/services/teamService";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TSwitchBillingPeriodInputSchema } from "./switchBillingPeriod.schema";

const log = logger.getSubLogger({ prefix: ["switchBillingPeriod"] });

type SwitchBillingPeriodOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TSwitchBillingPeriodInputSchema;
};

export const switchBillingPeriodHandler = async ({ ctx, input }: SwitchBillingPeriodOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Team billing is not enabled",
    });
  }

  const { teamId, targetPeriod } = input;
  const userId = ctx.user.id;

  const team = await TeamService.fetchTeamOrThrow(teamId);
  const permissionService = new PermissionCheckService();
  const hasPermission = await permissionService.checkPermission({
    userId,
    teamId,
    permission: team.isOrganization ? "organization.manageBilling" : "team.manageBilling",
    fallbackRoles: [MembershipRole.ADMIN, MembershipRole.OWNER],
  });

  if (!hasPermission) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only team admins or owners can switch billing periods",
    });
  }

  try {
    const billingPeriodService = new BillingPeriodService();

    if (targetPeriod === "MONTHLY") {
      const eligibility = await billingPeriodService.canSwitchToMonthly(teamId);
      if (!eligibility.allowed) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot switch to monthly billing outside the 30-day window before renewal",
        });
      }
    }

    const result = await billingPeriodService.switchBillingPeriod(teamId, targetPeriod);

    return {
      success: true,
      newPeriod: result.newPeriod,
      newPricePerSeat: result.newPricePerSeat,
      effectiveDate: result.effectiveDate ?? null,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    // ErrorWithCode is converted to TRPCError by errorConversionMiddleware
    throw error;
  }
};

export default switchBillingPeriodHandler;
