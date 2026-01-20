import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { IS_TEAM_BILLING_ENABLED } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TGetTeamBillingInfoInputSchema } from "./getTeamBillingInfo.schema";

const log = logger.getSubLogger({ prefix: ["getTeamBillingInfo"] });

const DEFAULT_MONTHLY_PRICE = 15;
const DEFAULT_ANNUAL_PRICE = 12;

type GetTeamBillingInfoOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetTeamBillingInfoInputSchema;
};

export const getTeamBillingInfoHandler = async ({ ctx, input }: GetTeamBillingInfoOptions) => {
  if (!IS_TEAM_BILLING_ENABLED) {
    return { billingPeriod: null, pricePerSeat: null };
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

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: {
        id: true,
        isOrganization: true,
        parentId: true,
      },
    });

    if (!team) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Team not found",
      });
    }

    // For teams that are part of an organization, get the org's billing info
    const billingTeamId = team.parentId || teamId;

    const teamBilling = await prisma.teamBilling.findUnique({
      where: { teamId: billingTeamId },
      select: {
        billingPeriod: true,
        pricePerSeat: true,
      },
    });

    // If no billing record exists, return default values based on monthly pricing
    if (!teamBilling) {
      log.debug(`No billing record found for team ${billingTeamId}, using default monthly pricing`);
      return {
        billingPeriod: "MONTHLY" as const,
        pricePerSeat: DEFAULT_MONTHLY_PRICE,
      };
    }

    // If billing record exists but pricePerSeat is null, use defaults based on billing period
    const pricePerSeat =
      teamBilling.pricePerSeat ??
      (teamBilling.billingPeriod === "ANNUALLY" ? DEFAULT_ANNUAL_PRICE : DEFAULT_MONTHLY_PRICE);

    return {
      billingPeriod: teamBilling.billingPeriod ?? "MONTHLY",
      pricePerSeat,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    log.error("Error getting team billing info", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to get team billing info",
    });
  }
};

export default getTeamBillingInfoHandler;
