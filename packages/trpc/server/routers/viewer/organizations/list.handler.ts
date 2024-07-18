import type { PrismaClient } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

type ListHandlerInput = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
};

// This functionality is essentially the same as the teams/list.handler.ts but it's easier for SOC to have it in a separate file.
export const listHandler = async ({ ctx }: ListHandlerInput) => {
  if (!ctx.user.organization?.id) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You do not belong to an organization" });
  }

  const membership = await ctx.prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      team: {
        id: ctx.user.organization.id,
      },
    },
    include: {
      team: true,
    },
  });

  const organizationSettings = await ctx.prisma.organizationSettings.findUnique({
    where: {
      organizationId: ctx.user.organization.id,
    },
    select: {
      lockEventTypeCreationForUsers: true,
      adminGetsNoSlotsNotification: true,
      isAdminReviewed: true,
    },
  });

  if (!membership) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You do not have a membership to your organization",
    });
  }

  const metadata = teamMetadataSchema.parse(membership?.team.metadata);

  return {
    canAdminImpersonate: !!organizationSettings?.isAdminReviewed,
    organizationSettings: {
      lockEventTypeCreationForUsers: organizationSettings?.lockEventTypeCreationForUsers,
      adminGetsNoSlotsNotification: organizationSettings?.adminGetsNoSlotsNotification,
    },
    user: {
      role: membership?.role,
      accepted: membership?.accepted,
    },
    ...membership?.team,
    metadata,
  };
};

export default listHandler;
