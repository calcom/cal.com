import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getValidBaseEmail } from "@calcom/lib/extract-base-email";
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
  const result = await checkMultipleEmailsVerificationRequired({
    userSessionEmail,
    emails: [email],
  });

  return result.requiresVerification;
};

export const checkMultipleEmailsVerificationRequired = async ({
  userSessionEmail,
  emails,
}: {
  userSessionEmail?: string;
  emails: string[];
}) => {
  // Filter out empty strings before checking
  const nonEmptyEmails = emails.filter((email) => email && email.trim() !== "");

  if (nonEmptyEmails.length === 0) {
    return {
      requiresVerification: false,
      count: 0,
      emailsRequiringVerification: [],
    };
  }

  const nonEmptyBaseEmails = nonEmptyEmails.map((email) => {
    const baseEmail = getValidBaseEmail(email);
    return {
      originalEmail: email,
      baseEmail,
    };
  });

  const uniqueNonEmptyBaseEmails = Array.from(new Set(nonEmptyBaseEmails.map((result) => result.baseEmail)));

  const userRepo = new UserRepository(prisma);
  const usersFromNonEmptyBaseEmails = await userRepo.findManyByEmailsWithEmailVerificationSettings({
    emails: uniqueNonEmptyBaseEmails,
  });

  const emailToRequiresBookerEmailVerificationMap = new Map(
    usersFromNonEmptyBaseEmails.map((user) => [
      user.email.toLowerCase(),
      user.requiresBookerEmailVerification,
    ])
  );

  const emailsRequiringVerification = nonEmptyBaseEmails
    .filter((result) => result.baseEmail.toLowerCase() !== userSessionEmail?.toLowerCase())
    .filter((result) => emailToRequiresBookerEmailVerificationMap.get(result.baseEmail.toLowerCase()))
    .map((result) => result.originalEmail);

  emailsRequiringVerification.forEach((email) => {
    log.warn(`user email requiring verification: ${email}`);
  });

  return {
    requiresVerification: emailsRequiringVerification.length > 0,
    count: emailsRequiringVerification.length,
    emailsRequiringVerification,
  };
};

export default userWithEmailHandler;
