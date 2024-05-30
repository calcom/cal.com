import logger from "@calcom/lib/logger";

import type { TUserEmailVerificationRequiredSchema } from "./checkIfUserEmailVerificationRequired.schema";

const log = logger.getSubLogger({ prefix: ["checkIfUserEmailVerificationRequired"] });

// Function to extract base email
const extractBaseEmail = (email: string): string => {
  const [localPart, domain] = email.split("@");
  const baseLocalPart = localPart.split("+")[0];
  return `${baseLocalPart}@${domain}`;
};

export const userWithEmailHandler = async ({ input }: { input: TUserEmailVerificationRequiredSchema }) => {
  const { userSessionEmail, email } = input;
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
  return false;
};

export default userWithEmailHandler;
