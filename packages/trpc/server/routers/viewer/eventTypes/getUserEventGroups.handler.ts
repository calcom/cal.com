import { checkRateLimitAndThrowError } from "@calcom/lib/checkRateLimitAndThrowError";
import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import type { PrismaClient } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TEventTypeInputSchema } from "./getByViewer.schema";

type GetByViewerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TEventTypeInputSchema;
};

export const getUserEventGroups = async ({ ctx, input }: GetByViewerOptions) => {
  await checkRateLimitAndThrowError({
    identifier: `eventTypes:getUserProfiles:${ctx.user.id}`,
    rateLimitingType: "common",
  });

  const user = ctx.user;
  const filters = input?.filters;
  const forRoutingForms = input?.forRoutingForms;

  try {
    return await EventTypeRepository.getUserEventGroups({
      upId: user.profile.upId,
      userId: user.id,
      filters,
      forRoutingForms,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Profile not found") {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
    throw error;
  }
};
