import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

export const checkActiveBookingsLimitForBooker = async ({
  eventTypeId,
  maxActiveBookingsPerBooker,
  bookerEmail,
}: {
  eventTypeId: number;
  maxActiveBookingsPerBooker: number | null;
  bookerEmail: string;
}) => {
  if (!maxActiveBookingsPerBooker) {
    return;
  }

  const bookingsCount = await prisma.booking.count({
    where: {
      eventTypeId,
      startTime: {
        gte: new Date(),
      },
      status: {
        in: [BookingStatus.ACCEPTED],
      },
      attendees: {
        some: {
          email: bookerEmail,
        },
      },
    },
  });

  if (bookingsCount >= maxActiveBookingsPerBooker) {
    throw new Error("Booker maximum active booking limit exceeded");
  }

  return;
};
