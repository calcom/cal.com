import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";
import type { CalendarEventsToSync } from "@calcom/types/Calendar";

const log = logger.getSubLogger({ prefix: ["CalendarSync"] });
async function processUpdatedEvent({
  calendarEvent,
  app,
}: {
  calendarEvent: CalendarEventsToSync[number];
  app: {
    type: "google_calendar";
    name: "Google Calendar";
  };
}) {
  const calendarEventId = calendarEvent.id;
  const bookingRef = await prisma.bookingReference.findFirst({
    where: { calendarEventId, type: app.type },
    select: {
      booking: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
          status: true,
        },
      },
    },
  });

  if (!bookingRef) {
    // This is a normal case, as there would be calendar events that didn't originate from Cal.com
    log.debug(
      `Could not find Cal.com booking reference for Calendar Event ${calendarEventId}. Calendar Event doesn't represent a Cal.com booking. Skipping sync.`
    );
    return;
  }

  const booking = bookingRef.booking;
  if (!booking) {
    // Shouldn't be possible normally
    log.error(`Could not find Cal.com booking for Calendar Event ${calendarEventId}. Skipping sync.`);
    return;
  }

  if (calendarEvent.status === "cancelled" && booking.status !== "CANCELLED") {
    log.info(
      `Calendar Event ${calendarEventId} is cancelled. Updating Cal.com booking ${booking.id} to CANCELLED.`
    );

    // TODO: Trigger emails and what not??
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "CANCELLED",
        cancelledBy: app.name,
      },
    });
  } else {
    // Compare times (ensure timezone handling)
    const calendarEventStartTime = dayjs(calendarEvent.startTime);
    const calendarEventEndTime = dayjs(calendarEvent.endTime);
    const bookingStartTime = dayjs(booking.startTime);
    const bookingEndTime = dayjs(booking.endTime);

    // Only update if times are different
    if (!calendarEventStartTime.isSame(bookingStartTime) || !calendarEventEndTime.isSame(bookingEndTime)) {
      // Check if the event is in the past
      if (calendarEventEndTime.isBefore(dayjs())) {
        log.info(
          `Calendar Event ${calendarEventId} time change is in the past. Skipping update to Cal.com booking ${booking.id}.`
        );
        return;
      }

      log.info(
        `Calendar Event ${calendarEventId} times updated. Updating Cal.com booking ${booking.id}.`,
        safeStringify({
          oldStart: bookingStartTime.format(),
          newStart: calendarEventStartTime.format(),
          oldEnd: bookingEndTime.format(),
          newEnd: calendarEventEndTime.format(),
        })
      );

      // Implement the booking time update
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          startTime: calendarEventStartTime.toDate(),
          endTime: calendarEventEndTime.toDate(),
          rescheduledBy: app.name,
        },
      });
    } else {
      log.debug(`No time change detected for booking ${booking.id}, skipping update`);
    }
  }
}

export async function syncEvents({
  calendarEvents,
  app,
}: {
  calendarEvents: CalendarEventsToSync;
  app: {
    type: "google_calendar";
    name: "Google Calendar";
  };
}) {
  try {
    const promiseResults = await Promise.allSettled(
      calendarEvents.map((calendarEvent) => processUpdatedEvent({ calendarEvent, app }))
    );
    return promiseResults.map((promiseResult) => {
      let ret;
      if (promiseResult.status === "rejected") {
        log.error("Error processing event", safeStringify(promiseResult.reason));
        ret = {
          status: "error",
          values: null,
        };
      } else {
        ret = {
          status: "success",
          values: promiseResult.value,
        };
      }
      return ret;
    });
  } catch (error) {
    log.error("Error processing event", safeStringify(error));
  }
}
