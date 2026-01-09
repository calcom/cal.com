import type { Prisma } from "@calcom/prisma/client";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

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
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      locale: true,
      timeZone: true,
      timeFormat: true,
      destinationCalendar: true,
      credentials: {
        select: credentialForCalendarServiceSelect,
      },
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
