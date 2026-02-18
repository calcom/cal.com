import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import prisma from "@calcom/prisma";

export const checkIfUserEmailIsVerified = async ({ userId }: { userId?: number }) => {
  if (!userId || userId <= 0) {
    return;
  }

  const user = await prisma.user.findFirst({
    where: { id: userId },
    select: {
      emailVerified: true,
    },
  });

  if (!user) {
    return;
  }

  if (!user.emailVerified) {
    throw new ErrorWithCode(
      ErrorCode.UserEmailNotVerified,
      "Your email must be verified before you can create a booking."
    );
  }
};
