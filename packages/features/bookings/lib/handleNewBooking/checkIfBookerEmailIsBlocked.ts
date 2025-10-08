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

  const user = await prisma.user.findFirst({
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
      preventEmailImpersonation: true,
    },
  });

  const isBlocked = blacklistedEmail || user?.preventEmailImpersonation;

  if (!isBlocked) {
    return false;
  }

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
