import type { TGuestEmailsVerificationRequiredSchema } from "./checkIfGuestEmailsVerificationRequired.schema";
import { checkMultipleEmailsVerificationRequired } from "./checkIfUserEmailVerificationRequired.handler";

export const guestEmailsVerificationRequiredHandler = async ({
  input,
}: {
  input: TGuestEmailsVerificationRequiredSchema;
}) => {
  return checkMultipleEmailsVerificationRequired(input);
};

export default guestEmailsVerificationRequiredHandler;
