import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import logger from "@calcom/lib/logger";
import { getTranslation } from "@calcom/lib/server/i18n";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import type { SelectedCalendar } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["CalendarSyncService"] });

/**
 * Service to handle synchronization of calendar events.
 */
export class CalendarSyncService {
  /**
   * Handles synchronization of calendar events
   *
   * @param selectedCalendar calendar to process
   * @param calendarSubscriptionEvents events to process
   * @returns
   */
  async handleEvents(
    selectedCalendar: SelectedCalendar,
    calendarSubscriptionEvents: CalendarSubscriptionEventItem[]
  ) {
    log.debug("handleEvents", {
      externalId: selectedCalendar.externalId,
      countEvents: calendarSubscriptionEvents.length,
    });

    // only process cal.com calendar events
    const calEvents = calendarSubscriptionEvents.filter((e) =>
      e.iCalUID?.toLowerCase()?.endsWith("@cal.com")
    );
    if (calEvents.length === 0) {
      log.debug("handleEvents: no calendar events to process");
      return;
    }

    log.debug("handleEvents: processing calendar events", { count: calEvents.length });
    await Promise.all(
      calEvents.map((e) => {
        if (e.status === "cancelled") {
          return this.cancelBooking(e);
        } else {
          return this.rescheduleBooking(e);
        }
      })
    );
  }

  /**
   * Cancels a booking
   * @param event
   * @returns
   */
  async cancelBooking(event: CalendarSubscriptionEventItem) {
    log.debug("cancelBooking", { event });
    // TODO implement (reference needed)
  }

  /**
   * Reschedule a booking
   * @param event
   */
  async rescheduleBooking(event: CalendarSubscriptionEventItem) {
    log.debug("rescheduleBooking", { event });
    const booking = await BookingRepository.findMany({
      iCalUID: event.iCalUID,
    });
    if (!booking) {
      log.debug("rescheduleBooking: no booking found", { iCalUID: event.iCalUID });
      return;
    }
    try {
      const rescheduleResult = await handleBookingTimeChange({
        booking,
        newStartTime: startTime,
        newEndTime: endTime,
        rescheduledBy,
      });
      return rescheduleResult;
    } catch (error) {
      // silently fail for now
      log.error("Failed to reschedule booking", { bookingId }, safeStringify(error));
    }
  }

  /**
   * Handles a booking time change
   */
  private async handleBookingTimeChange({
    booking,
    newStartTime,
    newEndTime,
    rescheduledBy,
  }: {
    booking: {
      id: number;
      eventType: {
        id: number;
        slug: string;
      };
      uid: string;
      bookerAttendee: {
        timeZone: string;
      };
      responses: Record<string, unknown> & {
        rescheduleReason: string;
      };
    };
    newStartTime: Date;
    newEndTime: Date;
    rescheduledBy: string;
  }) {
    const tEnglish = await getTranslation("en", "common");
    await handleNewBooking({
      bookingData: {
        bookingUid: booking.uid,
        bookingId: booking.id,
        eventTypeId: booking.eventType.id,
        eventTypeSlug: booking.eventType.slug,
        start: newStartTime.toISOString(),
        end: newEndTime.toISOString(),
        rescheduledBy,
        rescheduleUid: booking.uid,
        hasHashedBookingLink: false,
        language: "en",
        timeZone: booking.bookerAttendee.timeZone,
        metadata: {},
        responses: {
          ...booking.responses,
          rescheduleReason: tEnglish("event_moved_in_calendar"),
        },
      },
      skipAvailabilityCheck: true,
      skipEventLimitsCheck: true,
      skipCalendarSyncTaskCreation: true,
    });
  }
}
