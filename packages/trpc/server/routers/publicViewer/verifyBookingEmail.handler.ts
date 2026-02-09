import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";

import type { TVerifyBookingEmailInputSchema } from "./verifyBookingEmail.schema";

type VerifyBookingEmailOptions = {
  input: TVerifyBookingEmailInputSchema;
};

export const verifyBookingEmailHandler = async ({ input }: VerifyBookingEmailOptions) => {
  const { bookingUid, email } = input;
  const normalizedEmail = email.toLowerCase();

  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByUidIncludeUserEmailAndAttendeeEmails({ bookingUid });

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
