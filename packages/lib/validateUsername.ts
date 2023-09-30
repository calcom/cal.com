import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const validateUsername = async (
  username: string,
  email: string,
  organizationId?: number,
  inviteLinkType?: boolean
) => {
  // There is an existingUser if, within an org context or not, the username matches
  // OR if the email matches AND either the email is verified
  // or both username and password are set
  const query = {
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
  };
  const existingUser = await prisma.user.findFirst(query);
  return { isValid: !existingUser, email: existingUser?.email };
};

export const validateUsernameInToken = async (
  username: string,
  email: string,
  tokenTeam: { teamId: number; identifier: string }
) => {
  const inviteLinkType = tokenTeam.identifier.indexOf("invite-link-for-teamId") > -1;
  try {
    const team = await prisma.team.findFirst({
      where: {
        id: tokenTeam.teamId,
      },
      select: {
        metadata: true,
        parentId: true,
      },
    });

    const teamData = { ...team, metadata: teamMetadataSchema.parse(team?.metadata) };

    if (teamData.metadata?.isOrganization || teamData.parentId) {
      // Organization context -> org-context username check
      const orgId = teamData.parentId || tokenTeam.teamId;
      // Making sure any email not using org email domain address has appended
      // the first part of the domain address: acme.com -> free@example.com -> free-example
      const orgDomain = teamData.metadata?.orgAutoAcceptEmail;
      if (orgDomain && email.indexOf(orgDomain) === -1) {
        username = `${username}-${orgDomain?.split(".")[0]}`;
      }
      return validateUsername(username, email, orgId, inviteLinkType);
    } else {
      // Regular team context -> regular username check
      return validateUsername(username, email, undefined, inviteLinkType);
    }
  } catch (error) {
    console.error(error);
    return { isValid: false, email: undefined };
  }
};
