import { createDefaultAIPhoneServiceProvider } from "@calcom/features/calAIPhone";
import { CalAiPhoneNumberRepository } from "@calcom/features/calAIPhone/repositories/CalAiPhoneNumberRepository";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import logger from "@calcom/lib/logger";
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
  const organizationId = ctx.user.organizationId ?? ctx.user.profiles?.[0]?.organizationId;

  try {
    const userMemberships = await MembershipRepository.findAllByUserId({
      userId: ctx.user.id,
      filters: {
        accepted: true,
        roles: [MembershipRole.ADMIN, MembershipRole.OWNER],
      },
    });

    const adminTeamIds = userMemberships
      .filter((m) => !organizationId || m.team?.parentId === organizationId)
      .map((m) => m.teamId);

    const isOrgOwner = organizationId
      ? userMemberships.some((m) => m.role === MembershipRole.OWNER && m.team?.parentId === organizationId)
      : false;

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
        const parsedStartDate = Date.parse(input.filters.startDate);
        if (!isFinite(parsedStartDate)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid startDate format",
          });
        }
        startTimestamp.lower_threshold = parsedStartDate;
      }

      if (input.filters.endDate) {
        const parsedEndDate = Date.parse(input.filters.endDate);
        if (!isFinite(parsedEndDate)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid endDate format",
          });
        }
        startTimestamp.upper_threshold = parsedEndDate;
      }

      if (
        startTimestamp.lower_threshold &&
        startTimestamp.upper_threshold &&
        startTimestamp.lower_threshold > startTimestamp.upper_threshold
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "startDate must be before or equal to endDate",
        });
      }
    }

    const calls = await aiService.listCalls({
      limit: input.limit,
      offset: input.offset,
      filters: {
        fromNumber: uniquePhoneNumbers,
        ...(startTimestamp && { startTimestamp }),
      },
    });

    return {
      calls,
      totalCount: calls.length,
    };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    logger.error(`Failed to list calls for user ${ctx.user.id}:`, error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to retrieve call history",
    });
  }
};
