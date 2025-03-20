import userCanCreateTeamGroupMapping from "@calcom/features/ee/dsync/lib/server/userCanCreateTeamGroupMapping";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import type { ZCreateInputSchema } from "./create.schema";

type Options = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: ZCreateInputSchema;
};

export const createHandler = async ({ ctx, input }: Options) => {
  const { organizationId } = await userCanCreateTeamGroupMapping(
    ctx.user,
    ctx.user.organizationId,
    input.teamId
  );

  await prisma.dSyncTeamGroupMapping.create({
    data: {
      organizationId,
      teamId: input.teamId,
      groupName: input.name,
      directoryId: input.directoryId,
    },
  });

  return { newGroupName: input.name };
};

export default createHandler;
