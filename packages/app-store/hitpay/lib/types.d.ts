import type { Prisma } from "@calcom/prisma/client";

export type PaidBooking = Prisma.BookingGetPayload<{
  select: {
    uid: true;
    title: true;
    startTime: true;
    endTime: true;
    eventTypeId: true;
    eventType: {
      select: {
        slug: true;
        seatsPerTimeSlot: true;
      };
    };
    attendees: { include: { bookingSeat: true } };
  };
}>;
