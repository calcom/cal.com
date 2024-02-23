import prisma from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { ZDeleteInputSchema } from "./delete.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZDeleteInputSchema;
};

// Delete directory sync connection for a team
export const deleteHandler = async ({ ctx, input }: Options) => {
  if (!ctx.user.organizationId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "User not connected to an org" });
  }

  await prisma.dSyncTeamGroupMapping.delete({
    where: {
      teamId_groupName: {
        teamId: input.teamId,
        groupName: input.groupName,
      },
    },
  });

  return { deletedGroupName: input.groupName };
};
