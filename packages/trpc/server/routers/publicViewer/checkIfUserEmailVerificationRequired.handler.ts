import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import type { TUserEmailVerificationRequiredSchema } from "./checkIfUserEmailVerificationRequired.schema";

const log = logger.getSubLogger({ prefix: ["checkIfUserEmailVerificationRequired"] });

export const userWithEmailHandler = async ({ input }: { input: TUserEmailVerificationRequiredSchema }) => {
  return checkEmailVerificationRequired(input);
};

export const checkEmailVerificationRequired = async ({
  userSessionEmail,
  email,
}: {
  userSessionEmail?: string;
  email: string;
}) => {
  const baseEmail = extractBaseEmail(email);

  const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
    ? process.env.BLACKLISTED_GUEST_EMAILS.split(",")
    : [];

  const blacklistedEmail = blacklistedGuestEmails.find(
    (guestEmail: string) => guestEmail.toLowerCase() === baseEmail.toLowerCase()
  );

  if (!!blacklistedEmail && blacklistedEmail !== userSessionEmail) {
    log.warn(`blacklistedEmail: ${blacklistedEmail}`);
    return true;
  }

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: baseEmail,
          emailVerified: { not: null },
        },
        {
          secondaryEmails: {
            some: {
              email: baseEmail,
              emailVerified: { not: null },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      requiresBookerEmailVerification: true,
    },
  });

  if (user?.requiresBookerEmailVerification && baseEmail.toLowerCase() !== userSessionEmail?.toLowerCase()) {
    log.warn(`user email requiring verification: ${baseEmail}`);
    return true;
  }

  return false;
};

export default userWithEmailHandler;
