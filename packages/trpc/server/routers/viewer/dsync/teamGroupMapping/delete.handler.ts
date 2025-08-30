import userCanCreateTeamGroupMapping from "@calcom/features/ee/dsync/lib/server/userCanCreateTeamGroupMapping";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { ZDeleteInputSchema } from "./delete.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZDeleteInputSchema;
};

// Delete directory sync connection for a team
export const deleteHandler = async ({ ctx, input }: Options) => {
  await userCanCreateTeamGroupMapping(ctx.user, ctx.user.organizationId, input.teamId);

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

export default deleteHandler;
