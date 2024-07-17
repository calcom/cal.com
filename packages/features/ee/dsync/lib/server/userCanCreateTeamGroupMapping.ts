import { canAccess } from "@calcom/features/ee/sso/lib/saml";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

const userCanCreateTeamGroupMapping = async (
  user: NonNullable<TrpcSessionUser>,
  organizationId: number | null,
  teamId?: number
) => {
  if (!organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Could not find organization id",
    });
  }

  const { message, access } = await canAccess(user, organizationId);
  if (!access) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message,
    });
  }

  if (teamId) {
    const orgTeam = await prisma.team.findFirst({
      where: {
        id: teamId,
        parentId: organizationId,
      },
      select: {
        id: true,
      },
    });

    if (!orgTeam) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Could not find team",
      });
    }
  }

  return { organizationId };
};

export default userCanCreateTeamGroupMapping;
