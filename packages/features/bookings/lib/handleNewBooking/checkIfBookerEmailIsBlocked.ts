import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { HttpError } from "@calcom/lib/http-error";
import type { UserRepository } from "@calcom/lib/server/repository/user";

export const checkIfBookerEmailIsBlocked = async ({
  bookerEmail,
  loggedInUserId,
  userRepository,
}: {
  bookerEmail: string;
  loggedInUserId?: number;
  userRepository: UserRepository;
}) => {
  const baseEmail = extractBaseEmail(bookerEmail);
  const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
    ? process.env.BLACKLISTED_GUEST_EMAILS.split(",")
    : [];

  const blacklistedEmail = blacklistedGuestEmails.find(
    (guestEmail: string) => guestEmail.toLowerCase() === baseEmail.toLowerCase()
  );
  if (!blacklistedEmail) {
    return false;
  }

  const user = await userRepository.findVerifiedUserByEmail({ email: baseEmail });

  if (!user) {
    throw new HttpError({ statusCode: 403, message: "Cannot use this email to create the booking." });
  }

  if (user.id !== loggedInUserId) {
    throw new HttpError({
      statusCode: 403,
      message: `Attendee email has been blocked. Make sure to login as ${bookerEmail} to use this email for creating a booking.`,
    });
  }
};
