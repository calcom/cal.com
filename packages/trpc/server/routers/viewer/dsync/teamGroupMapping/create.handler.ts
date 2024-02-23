import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import type { ZCreateInputSchema } from "./create.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: Options) => {
  if (!ctx.user.organizationId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User not connected to an org" });
  }

  await prisma.dSyncTeamGroupMapping.create({
    data: {
      orgId: ctx.user.organizationId,
      teamId: input.teamId,
      groupName: input.name,
      directoryId: input.directoryId,
    },
  });

  return { newGroupName: input.name };
};
