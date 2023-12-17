import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import prisma from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

export const getUsernameForOrgMember = async ({
  email,
  orgAutoAcceptEmail,
  isSignup,
  username,
}: {
  username?: string;
  email: string;
  orgAutoAcceptEmail?: string;
  isSignup: boolean;
}) => {
  if (isSignup) {
    // We ensure that the username is always derived from the email during signup.
    return getOrgUsernameFromEmail(email, orgAutoAcceptEmail || "");
  }
  if (!username) {
    throw new Error("Username is required");
  }
  // Right now it's not possible to change username in an org by the user but when that's allowed we would simply accept the provided username
  return username;
};

export const validateAndGetCorrectedUsernameAndEmail = async ({
  username,
  email,
  organizationId,
  orgAutoAcceptEmail,
  isSignup,
}: {
  username: string;
  email: string;
  organizationId?: number;
  orgAutoAcceptEmail?: string;
  isSignup: boolean;
}) => {
  if (username.includes("+")) {
    return { isValid: false, username: undefined, email };
  }
  // There is an existingUser if, within an org context or not, the username matches
  // OR if the email matches AND either the email is verified
  // or both username and password are set
  const existingUser = await prisma.user.findFirst({
    where: {
      ...(organizationId ? { organizationId } : {}),
      OR: [
        // When inviting to org, invited user gets created with username now, so in an org context we
        // can't check for username as it will exist on signup
        ...(!organizationId ? [{ username }] : [{}]),
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
  let validatedUsername = username;
  if (organizationId) {
    validatedUsername = await getUsernameForOrgMember({
      email,
      orgAutoAcceptEmail,
      isSignup,
    });
  }

  return { isValid: !existingUser, username: validatedUsername, email: existingUser?.email };
};

export const validateAndGetCorrectedUsernameInTeam = async (
  username: string,
  email: string,
  teamId: number,
  isSignup: boolean
) => {
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
      const orgMetadata = teamData.metadata;
      // Organization context -> org-context username check
      const orgId = teamData.parentId || teamId;
      return validateAndGetCorrectedUsernameAndEmail({
        username,
        email,
        organizationId: orgId,
        orgAutoAcceptEmail: orgMetadata?.orgAutoAcceptEmail || "",
        isSignup,
      });
    } else {
      // Regular team context -> regular username check
      return validateAndGetCorrectedUsernameAndEmail({ username, email, isSignup });
    }
  } catch (error) {
    console.error(error);
    return { isValid: false, username: undefined, email: undefined };
  }
};
