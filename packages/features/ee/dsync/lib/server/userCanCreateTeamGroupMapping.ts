import { canAccessOrganization } from "@calcom/features/ee/sso/lib/saml";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { HttpError } from "@calcom/lib/http-error";

const userCanCreateTeamGroupMapping = async (
  user: NonNullable<TrpcSessionUser>,
  organizationId: number | null,
  teamId?: number
) => {
  if (!organizationId) {
    throw new HttpError({
      statusCode: 400,
      message: "Could not find organization id",
    });
  }

  const { message, access } = await canAccessOrganization(user, organizationId);
  if (!access) {
    throw new HttpError({
      statusCode: 400,
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
      throw new HttpError({
        statusCode: 400,
        message: "Could not find team",
      });
    }
  }

  return { organizationId };
};

export default userCanCreateTeamGroupMapping;
