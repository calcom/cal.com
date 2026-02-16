import prisma from "@calcom/prisma";

export const validateAndGetCorrectedUsernameAndEmail = async ({
  username,
  email,
  isSignup,
}: {
  username: string;
  email: string;
  isSignup: boolean;
}) => {
  if (username.includes("+")) {
    return { isValid: false, username: undefined, email };
  }

  // There is an existingUser if the username matches
  // OR if the email matches AND either the email is verified
  // or both username and password are set
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { username },
        {
          AND: [
            { email },
            {
              OR: [
                { emailVerified: { not: null } },
                { AND: [{ password: { isNot: null } }, { username: { not: null } }] },
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

  return { isValid: !existingUser, username, email: existingUser?.email };
};

export const validateAndGetCorrectedUsernameInTeam = async (
  username: string,
  email: string,
  teamId: number,
  isSignup: boolean
) => {
  try {
    // CASE 1: if it's the same user that was invited to the team, allow the username
    const user = await prisma.user.findFirst({
      where: {
        email,
        invitedTo: teamId,
      },
    });
    if (user) {
      return { isValid: true, username: user.username, email: user.email };
    }

    // CASE 2: if it's a different user, check if the username or email is taken
    return validateAndGetCorrectedUsernameAndEmail({ username, email, isSignup });
  } catch (error) {
    console.error(error);
    return { isValid: false, username: undefined, email: undefined };
  }
};
