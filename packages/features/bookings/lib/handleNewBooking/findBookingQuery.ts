import { withReporting } from "@calcom/lib/sentryWrapper";
import prisma from "@calcom/prisma";

// Define the function with underscore prefix
const _findBookingQuery = async (bookingId: number) => {
  const foundBooking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: {
      uid: true,
      location: true,
      startTime: true,
      endTime: true,
      title: true,
      description: true,
      status: true,
      responses: true,
      metadata: true,
      user: {
        select: {
          uuid: true,
          name: true,
          email: true,
          timeZone: true,
          username: true,
          isPlatformManaged: true,
        },
      },
      eventType: {
        select: {
          title: true,
          description: true,
          currency: true,
          length: true,
          lockTimeZoneToggleOnBookingPage: true,
          requiresConfirmation: true,
          requiresBookerEmailVerification: true,
          price: true,
        },
      },
    },
  });

  // This should never happen but it's just typescript safe
  if (!foundBooking) {
    throw new Error("Internal Error. Couldn't find booking");
  }

  // Don't leak any sensitive data
  return foundBooking;
};

export const findBookingQuery = withReporting(_findBookingQuery, "findBookingQuery");
