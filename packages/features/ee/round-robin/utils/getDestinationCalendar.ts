import { prisma } from "@calcom/prisma";
import type { DestinationCalendar, EventType, Booking, User } from "@calcom/prisma/client";

export async function getDestinationCalendar({
  eventType,
  booking,
  newUserId,
  hasOrganizerChanged,
}: {
  eventType?: EventType & { destinationCalendar?: DestinationCalendar | null };
  booking?: Booking & { user?: User & { destinationCalendar?: DestinationCalendar | null } };
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
