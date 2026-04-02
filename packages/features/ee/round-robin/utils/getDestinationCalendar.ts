import type { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import { prisma } from "@calcom/prisma";
import type { DestinationCalendar } from "@calcom/prisma/client";
import type { BookingSelectResult } from "./bookingSelect";

export async function getDestinationCalendar({
  eventType,
  booking,
  newUserId,
  hasOrganizerChanged,
}: {
  eventType?: Awaited<ReturnType<typeof getEventTypesFromDB>>;
  booking?: BookingSelectResult;
  newUserId?: number;
  hasOrganizerChanged: boolean;
}): Promise<DestinationCalendar[] | undefined> {
  if (eventType?.destinationCalendar) {
    return [eventType.destinationCalendar];
  }

  if (hasOrganizerChanged && newUserId) {
    const newUserDestinationCalendar = await prisma.destinationCalendar.findFirst({
      where: {
        userId: newUserId,
      },
    });
    if (newUserDestinationCalendar) {
      return [newUserDestinationCalendar];
    }
  } else {
    if (booking?.user?.destinationCalendar) return [booking.user.destinationCalendar];
  }

  return undefined;
}
