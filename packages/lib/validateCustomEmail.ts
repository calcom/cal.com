import prisma from "@calcom/prisma";

/**
 * Validates that the provided email is a verified email for the user or team
 */
export const validateCustomEmail = async ({
  email,
  userId,
  teamId,
}: {
  email: string;
  userId: number;
  teamId?: number | null;
}) => {
  const verifiedEmail = await prisma.verifiedEmail.findFirst({
    where: {
      email,
      OR: [{ userId }, { teamId }],
    },
  });

  if (verifiedEmail) {
    return true;
  }

  return false;
};
