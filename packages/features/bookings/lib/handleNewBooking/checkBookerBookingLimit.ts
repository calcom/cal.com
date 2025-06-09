import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

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
      status: {
        in: [BookingStatus.PENDING, BookingStatus.ACCEPTED],
      },
      attendees: {
        some: {
          email: bookerEmail,
        },
      },
    },
  });

  if (bookingsCount >= bookerBookingLimit) {
    throw new Error("Booker booking limit exceeded");
  }

  return;
};
