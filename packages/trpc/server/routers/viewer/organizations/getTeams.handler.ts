import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";

type GetTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function getTeamsHandler({ ctx }: GetTeamsHandler) {
  const currentUser = ctx.user;
  const currentUserOrgId = ctx.user.organizationId ?? currentUser.profiles[0].organizationId;

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
