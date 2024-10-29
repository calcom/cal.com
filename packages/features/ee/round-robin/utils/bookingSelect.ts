import type { Prisma } from "@calcom/prisma/client";

export const bookingSelect = {
  uid: true,
  title: true,
  startTime: true,
  endTime: true,
  userId: true,
  customInputs: true,
  responses: true,
  description: true,
  location: true,
  eventTypeId: true,
  destinationCalendar: true,
  user: {
    include: {
      destinationCalendar: true,
    },
  },
  attendees: true,
  references: true,
  metadata: true,
  iCalUID: true,
};

export type BookingSelectResult = Prisma.BookingGetPayload<{
  select: typeof bookingSelect;
}>;
