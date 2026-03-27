import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import type { TUserEmailVerificationRequiredSchema } from "./checkIfUserEmailVerificationRequired.schema";

const log = logger.getSubLogger({ prefix: ["checkIfUserEmailVerificationRequired"] });

// eslint-disable-next-line turbo/no-undeclared-env-vars
const blacklistedGuestEmails = new Set(
  (process.env.BLACKLISTED_GUEST_EMAILS ?? "")
    .split(",")
    .filter(Boolean)
    .map((e) => e.trim().toLowerCase())
);

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
  const baseEmail = extractBaseEmail(email).toLowerCase();

  if (baseEmail === userSessionEmail?.toLowerCase()) {
    return false;
  }

  if (blacklistedGuestEmails.has(baseEmail)) {
    log.warn(`blacklistedEmail: ${baseEmail}`);
    return true;
  }

  const userRepo = new UserRepository(prisma);
  const requiresVerification = await userRepo.checkIfEmailRequiresVerification({ email: baseEmail });

  if (requiresVerification) {
    log.warn(`user email requiring verification: ${baseEmail}`);
  }

  return requiresVerification;
};

export default userWithEmailHandler;
