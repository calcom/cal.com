import { prisma } from "@calcom/prisma";

import type { TVerifyBookingEmailInputSchema } from "./verifyBookingEmail.schema";

type VerifyBookingEmailOptions = {
  input: TVerifyBookingEmailInputSchema;
};

export const verifyBookingEmailHandler = async ({ input }: VerifyBookingEmailOptions) => {
  const { bookingUid, email } = input;
  const normalizedEmail = email.toLowerCase();

  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingUid,
    },
    select: {
      user: {
        select: {
          email: true,
        },
      },
      attendees: {
        select: {
          email: true,
        },
      },
    },
  });

  if (!booking) {
    return { isValid: false };
  }

  const isHostEmail = booking.user?.email?.toLowerCase() === normalizedEmail;
  const isAttendeeEmail = booking.attendees.some(
    (attendee) => attendee.email.toLowerCase() === normalizedEmail
  );

  return { isValid: isHostEmail || isAttendeeEmail };
};

export default verifyBookingEmailHandler;
