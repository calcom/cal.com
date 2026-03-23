import { canAccessOrganization } from "@calcom/features/ee/sso/lib/saml";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";

const userCanCreateTeamGroupMapping = async (
  user: { id: number; email: string },
  organizationId: number | null,
  teamId?: number
) => {
  if (!organizationId) {
    throw new ErrorWithCode(ErrorCode.BadRequest, "Could not find organization id");
  }

  const { message, access } = await canAccessOrganization(user, organizationId);
  if (!access) {
    throw new ErrorWithCode(ErrorCode.BadRequest, message);
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
      throw new ErrorWithCode(ErrorCode.BadRequest, "Could not find team");
    }
  }

  return { organizationId };
};

export default userCanCreateTeamGroupMapping;
