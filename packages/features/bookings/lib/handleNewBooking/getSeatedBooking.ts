import prisma from "@calcom/prisma";
import type { BookingSeat } from "../handleSeats/types";

export const getSeatedBooking = async (bookingSeatUid: string): Promise<BookingSeat | null> => {
  // rescheduleUid can be bookingUid and bookingSeatUid
  return prisma.bookingSeat.findUnique({
    where: {
      referenceUid: bookingSeatUid,
    },
    include: {
      booking: true,
      attendee: true,
    },
  });
};
