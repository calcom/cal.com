import { mapBusinessErrorToTRPCError } from "@calcom/lib/errorMapping";
import { AuthorizationError } from "@calcom/lib/errors";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type GetTeamsHandler = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export async function getTeamsHandler({ ctx }: GetTeamsHandler) {
  try {
    const currentUser = ctx.user;
    const currentUserOrgId = ctx.user.organizationId ?? currentUser.profiles[0].organizationId;

    if (!currentUserOrgId) throw new AuthorizationError("User not part of any organization");

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
  } catch (error) {
    throw mapBusinessErrorToTRPCError(error);
  }
}

export default getTeamsHandler;
