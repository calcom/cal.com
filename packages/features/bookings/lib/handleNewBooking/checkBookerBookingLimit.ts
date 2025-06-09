import prisma from "@calcom/prisma";

export const checkBookerBookingLimit = async ({
  eventTypeId,
  bookerBookingLimit,
  bookerEmail,
}: {
  eventTypeId: number;
  bookerBookingLimit: number | null;
  bookerEmail: string;
}) => {
  if (!bookerBookingLimit) {
    return;
  }

  const bookingsCount = await prisma.booking.count({
    where: {
      eventTypeId,
      startTime: {
        gte: new Date(),
      },
      attendees: {
        some: {
          email: bookerEmail,
        },
      },
    },
  });

  if (bookingsCount >= bookerBookingLimit) {
    throw new Error("booker_booking_limit_exceeded");
  }

  return;
};
