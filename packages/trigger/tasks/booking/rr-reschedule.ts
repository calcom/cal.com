import { schemaTask } from "@trigger.dev/sdk";
import { z } from "zod";

import { CalendarEventBuilder } from "@calcom/features/CalendarEventBuilder";
import { BookingEmailSmsHandler } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";

import { TriggerDevLogger } from "../../logger";

export const rrReschedule = schemaTask({
  id: "booking.rr.reschedule",
  schema: z.object({
    bookingId: z.number(),
  }),
  run: async (payload: { bookingId: number }) => {
    const triggerDevLogger = new TriggerDevLogger();
    const emailsAndSmsHandler = new BookingEmailSmsHandler({ logger: triggerDevLogger });
    const bookingRepo = new BookingRepository(prisma);
    const booking = await bookingRepo.getBookingForCalEventBuilder(payload.bookingId);
    if (booking) {
      let originalBookingData = await bookingRepo.findOriginalRescheduledBooking(
        booking.uid,
        !!booking.eventType?.seatsPerTimeSlot
      );

      if (!originalBookingData) {
        originalBookingData = null;
        return;
      }

      if (originalBookingData.status === "CANCELLED" && !originalBookingData.rescheduled) {
        originalBookingData = null;
        return;
      }

      // TODO: add calEventBuilder meta
      const calendarEvent = (await CalendarEventBuilder.fromBooking(booking, {})).build();
      if (calendarEvent) {
        // TODO: CHANGE TO BOOKING_RESCHEDULED
        await emailsAndSmsHandler.send({
          action: "BOOKING_RESCHEDULED",
          data: {
            evt: calendarEvent,
            eventType: {
              schedulingType: booking.eventType?.schedulingType ?? null,
              metadata: (booking.eventType?.metadata as object) ?? null,
            },
            additionalInformation: calendarEvent.additionalInformation ?? {},
            additionalNotes: calendarEvent.additionalNotes,
            iCalUID: calendarEvent.iCalUID ?? "",
            originalRescheduledBooking: originalBookingData,
            rescheduleReason: (calendarEvent?.responses?.["rescheduleReason"]?.value as string) ?? undefined,
            users: booking.users,
            changedOrganizer: true,
            isRescheduledByBooker: true,
          },
        });
      }
    }
  },
});
