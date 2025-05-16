import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

export const getBookingRequest = async ({
  bookerEmail,
  bookerPhoneNumber,
  startTime,
  eventTypeId,
}: {
  bookerEmail: string;
  bookerPhoneNumber: string | undefined;
  startTime: Date;
  eventTypeId: number;
}) => {
  // See if there's already an existing request
  const booking = await prisma.booking.findFirst({
    where: {
      eventTypeId,
      startTime,
      attendees: {
        some: {
          email: bookerEmail,
          phoneNumber: bookerPhoneNumber,
        },
      },
      status: BookingStatus.PENDING,
    },
    include: {
      attendees: true,
      references: true,
      user: true,
    },
  });
  return booking;
};
