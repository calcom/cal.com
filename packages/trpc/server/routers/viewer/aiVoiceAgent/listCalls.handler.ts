import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import logger from "@calcom/lib/logger";
import { CalAiPhoneNumberRepository } from "@calcom/lib/server/repository/calAiPhoneNumber";
import { MembershipRepository } from "@calcom/lib/server/repository/membership";
import { MembershipRole } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TListCallsInputSchema } from "./listCalls.schema";

type ListCallsHandlerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TListCallsInputSchema;
};

export const listCallsHandler = async ({ ctx, input }: ListCallsHandlerOptions) => {
  const organizationId = ctx.user.organizationId ?? ctx.user.profiles[0]?.organizationId;

  try {
    const userMemberships = await MembershipRepository.findAllByUserId({
      userId: ctx.user.id,
      filters: {
        accepted: true,
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    });

    const adminTeamIds = userMemberships
      .filter((m) => m.team?.parentId === organizationId)
      .map((m) => m.teamId);

    const isOrgOwner = userMemberships.some(
      (m) => m.role === MembershipRole.OWNER && m.team?.parentId === organizationId
    );

    const uniquePhoneNumbers = await CalAiPhoneNumberRepository.getAccessiblePhoneNumbers({
      userId: ctx.user.id,
      organizationId,
      isOrgOwner,
      adminTeamIds,
    });

    if (uniquePhoneNumbers.length === 0) {
      logger.info("No phone numbers found for user", { userId: ctx.user.id, organizationId });
      return {
        calls: [],
        totalCount: 0,
      };
    }

    const aiService = createDefaultAIPhoneServiceProvider();

    let startTimestamp: { lower_threshold?: number; upper_threshold?: number } | undefined;
    if (input.filters?.startDate || input.filters?.endDate) {
      startTimestamp = {};
      if (input.filters.startDate) {
        startTimestamp.lower_threshold = new Date(input.filters.startDate).getTime();
      }
      if (input.filters.endDate) {
        startTimestamp.upper_threshold = new Date(input.filters.endDate).getTime();
      }
    }

    const calls = await aiService.listCalls({
      phoneNumbers: uniquePhoneNumbers,
      limit: input.limit,
      offset: input.offset,
      filters: {
        ...(startTimestamp && { startTimestamp }),
      },
    });

    return {
      calls,
      totalCount: calls.length,
    };
  } catch (error) {
    logger.error(`Failed to list calls for user ${ctx.user.id}:`, error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to retrieve call history",
    });
  }
};
