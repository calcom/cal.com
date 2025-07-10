import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type GetTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function getTeamsHandler({ ctx: { user: authedUser } }: GetTeamsHandler) {
  const currentUserOrgId = authedUser.profile?.organizationId;
  if (!currentUserOrgId) throw new TRPCError({ code: "UNAUTHORIZED" });

  const allOrgTeams = await prisma.team.findMany({
    where: {
      parentId: currentUserOrgId,
    },
    select: {
      id: true,
      name: true,
    },
  });

  return allOrgTeams;
}

export default getTeamsHandler;
