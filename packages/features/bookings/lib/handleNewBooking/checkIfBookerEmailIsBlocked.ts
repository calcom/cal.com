import { verifyCodeUnAuthenticated } from "@calcom/features/auth/lib/verifyCodeUnAuthenticated";
import type { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { ErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { extractBaseEmail } from "@calcom/lib/extract-base-email";

export const checkIfBookerEmailIsBlocked = async ({
  bookerEmail,
  loggedInUserId,
  verificationCode,
  isReschedule,
  userRepository,
}: {
  bookerEmail: string;
  loggedInUserId?: number;
  verificationCode?: string;
  isReschedule: boolean;
  userRepository: UserRepository;
}) => {
  const baseEmail = extractBaseEmail(bookerEmail);

  const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
    ? process.env.BLACKLISTED_GUEST_EMAILS.split(",")
    : [];

  const blacklistedByEnv = blacklistedGuestEmails.find(
    (guestEmail: string) => guestEmail.toLowerCase() === baseEmail.toLowerCase()
  );

  const user = await userRepository.findVerifiedUserByEmail({ email: baseEmail });

  const blockedByUserSetting = user?.requiresBookerEmailVerification ?? false;
  const shouldBlock = !!blacklistedByEnv || (blockedByUserSetting && !isReschedule);

  if (!shouldBlock) {
    return false;
  }

  if (!user) {
    throw new ErrorWithCode(ErrorCode.BookerEmailBlocked, "Cannot use this email to create the booking.");
  }

  if (user.id !== loggedInUserId) {
    if (verificationCode) {
      let isValid = false;

      try {
        isValid = await verifyCodeUnAuthenticated(baseEmail, verificationCode);
      } catch {
        throw new ErrorWithCode(
          ErrorCode.UnableToValidateVerificationCode,
          "There was an error validating the verification code"
        );
      }

      if (!isValid) {
        throw new ErrorWithCode(ErrorCode.InvalidVerificationCode, "Invalid verification code");
      }

      return false;
    }

    throw new ErrorWithCode(
      ErrorCode.BookerEmailRequiresLogin,
      `Attendee email has been blocked. Make sure to login as ${bookerEmail} to use this email for creating a booking.`,
      { email: bookerEmail }
    );
  }
};
