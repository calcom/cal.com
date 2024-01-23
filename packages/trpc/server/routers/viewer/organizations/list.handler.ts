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

  if (!membership) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "You do not have a membership to your organization",
    });
  }

  const metadata = teamMetadataSchema.parse(membership?.team.metadata);

  return {
    user: {
      role: membership?.role,
      accepted: membership?.accepted,
    },
    ...membership?.team,
    metadata,
  };
};

export default listHandler;
