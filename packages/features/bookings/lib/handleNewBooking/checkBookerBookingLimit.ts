import prisma from "@calcom/prisma";

export const checkBookerBookingLimit = async ({
  eventTypeId,
  bookerEmail,
}: {
  eventTypeId: number;
  bookerEmail: string;
}) => {
  const bookings = await prisma.booking.count({
    where: {
      eventTypeId,
    },
  });

  const bookerBookingLimit = eventType.bookerBookingLimit;

  if (!bookerBookingLimit) {
    return;
  }

  const bookingCount = await prisma.booking.count({
    where: {
      eventTypeId,
      bookerEmail,
    },
  });

  if (bookingCount >= bookerBookingLimit) {
    throw new Error("booker_booking_limit_exceeded");
  }
};
