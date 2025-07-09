import { canAccess } from "@calcom/features/ee/sso/lib/saml";
import { ValidationError, NotFoundError } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

const userCanCreateTeamGroupMapping = async (
  user: NonNullable<TrpcSessionUser>,
  organizationId: number | null,
  teamId?: number
) => {
  if (!organizationId) {
    throw new ValidationError("Could not find organization id");
  }

  const { message, access } = await canAccess(user, organizationId);
  if (!access) {
    throw new ValidationError(message);
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
      throw new NotFoundError("Could not find team");
    }
  }

  return { organizationId };
};

export default userCanCreateTeamGroupMapping;
