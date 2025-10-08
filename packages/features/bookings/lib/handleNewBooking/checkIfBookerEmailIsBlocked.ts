import { extractBaseEmail } from "@calcom/lib/extract-base-email";
import { HttpError } from "@calcom/lib/http-error";
import prisma from "@calcom/prisma";

export const checkIfBookerEmailIsBlocked = async ({
  bookerEmail,
  loggedInUserId,
}: {
  bookerEmail: string;
  loggedInUserId?: number;
}) => {
  const baseEmail = extractBaseEmail(bookerEmail);
  const blacklistedGuestEmails = process.env.BLACKLISTED_GUEST_EMAILS
    ? process.env.BLACKLISTED_GUEST_EMAILS.split(",")
    : [];

  const blacklistedEmail = blacklistedGuestEmails.find(
    (guestEmail: string) => guestEmail.toLowerCase() === baseEmail.toLowerCase()
  );

  const userWithEmail = await prisma.user.findFirst({
    where: {
      OR: [
        {
          email: baseEmail,
          emailVerified: {
            not: null,
          },
        },
        {
          secondaryEmails: {
            some: {
              email: baseEmail,
              emailVerified: {
                not: null,
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      email: true,
      preventBookings: true,
    },
  });

  // If email is in env blacklist
  if (blacklistedEmail) {
    // If no user found with this email, block the booking
    if (!userWithEmail) {
      throw new HttpError({ statusCode: 403, message: "Cannot use this email to create the booking." });
    }

    // If user found but not logged in as that user, block the booking
    if (userWithEmail.id !== loggedInUserId) {
      throw new HttpError({
        statusCode: 403,
        message: `Attendee email has been blocked. Make sure to login as ${bookerEmail} to use this email for creating a booking.`,
      });
    }
  }

  // If user has preventBookings enabled
  if (userWithEmail?.preventBookings) {
    // Only allow if logged in as that user
    if (userWithEmail.id !== loggedInUserId) {
      throw new HttpError({
        statusCode: 403,
        message: `This email owner has disabled bookings with their email. Make sure to login as ${bookerEmail} to use this email for creating a booking.`,
      });
    }
  }

  return false;
};
