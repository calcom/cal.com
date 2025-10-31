import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";

import { TriggerDevLogger } from "../../logger";

export const request = schemaTask({
  id: "booking.request",
  schema: z.object({
    bookingId: z.number(),
  }),
  run: async (payload: { bookingId: number }) => {
    const triggerDevLogger = new TriggerDevLogger();
    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: triggerDevLogger });
    const bookingRepo = new BookingRepository(prisma);
    const booking = await bookingRepo.getBookingForCalEventBuilder(payload.bookingId);
    if (booking) {
      // TODO: add calEventBuilder meta
      const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, {})).build();
      if (calendarEvent) {
        await emailsAndSmsHandler.send({
          action: "BOOKING_REQUESTED",
          data: {
            evt: calendarEvent,
            attendees: calendarEvent.attendees,
            eventType: {
              schedulingType: booking.eventType?.schedulingType ?? null,
              metadata: (booking.eventType?.metadata as object) ?? null,
            },
            additionalNotes: calendarEvent.additionalNotes,
          },
        });
      }
    }
  },
});
