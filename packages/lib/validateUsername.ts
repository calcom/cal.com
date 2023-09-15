import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const validateUsername = async (username: string, email: string, organizationId?: number) => {
  // There is an existingUser if, within an org context or not, the username matches
  // OR if the email matches AND either the email is verified
  // or both username and password are set
  const existingUser = await prisma.user.findFirst({
    where: {
      ...(organizationId ? { organizationId } : {}),
      OR: [
        { username },
        {
          AND: [
            { email },
            {
              OR: [
                { emailVerified: { not: null } },
                {
                  AND: [{ password: { not: null } }, { username: { not: null } }],
                },
              ],
            },
          ],
        },
      ],
    },
    select: {
      email: true,
    },
  });
  return { isValid: !existingUser, email: existingUser?.email };
};

export const validateUsernameInTeam = async (username: string, email: string, teamId: number) => {
  try {
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
      },
      select: {
        metadata: true,
        parentId: true,
      },
    });

    const teamData = { ...team, metadata: teamMetadataSchema.parse(team?.metadata) };

    if (teamData.metadata?.isOrganization || teamData.parentId) {
      // Organization context -> org-context username check
      const orgId = teamData.parentId || teamId;
      return validateUsername(username, email, orgId);
    } else {
      // Regular team context -> regular username check
      return validateUsername(username, email);
    }
  } catch (error) {
    console.error(error);
    return { isValid: false, email: undefined };
  }
};
