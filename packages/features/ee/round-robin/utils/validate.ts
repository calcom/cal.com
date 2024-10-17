import type { Booking, EventType } from "@prisma/client";

import { getEventTypesFromDB } from "@calcom/features/bookings/lib/handleNewBooking/getEventTypesFromDB";
import type { Logger } from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import { bookingSelect } from "./bookingSelect";

export async function validateAndFetchBookingAndEventType({
  bookingId,
  logger,
}: {
  bookingId: number;
  logger: Logger;
}): Promise<{ booking: Booking; eventType: EventType }> {
  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    select: bookingSelect,
  });

  if (!booking) {
    logger.error(`Booking ${bookingId} not found`);
    throw new Error("Booking not found");
  }

  if (!booking.user) {
    logger.error(`No user associated with booking ${bookingId}`);
    throw new Error("Booking not found");
  }

  const eventTypeId = booking.eventTypeId;

  if (!eventTypeId) {
    logger.error(`Booking ${bookingId} does not have an event type id`);
    throw new Error("Event type not found");
  }

  const eventType = await getEventTypesFromDB(eventTypeId);

  if (!eventType) {
    logger.error(`Event type ${eventTypeId} not found`);
    throw new Error("Event type not found");
  }

  return { booking, eventType };
}
