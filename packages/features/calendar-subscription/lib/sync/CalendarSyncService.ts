import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { getRegularBookingService } from "@calcom/features/bookings/di/RegularBookingService.container";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { SelectedCalendar } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["CalendarSyncService"] });

/**
 * Service to handle synchronization of calendar events.
 */
export class CalendarSyncService {
  constructor(
    private deps: {
      bookingRepository: BookingRepository;
    }
  ) {}

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
    const [bookingUid] = event.iCalUID?.split("@") ?? [undefined];
    if (!bookingUid) {
      log.debug("Unable to sync, booking UID not found in iCalUID");
      return;
    }

    const booking = await this.deps.bookingRepository.findBookingByUidWithEventType({ bookingUid });
    if (!booking) {
      log.debug("Unable to sync, booking not found in database", { bookingUid });
      return;
    }

    try {
      await handleCancelBooking({
        userId: booking.userId!,
        bookingData: {
          uid: booking.uid,
          cancellationReason: "Cancelled on user's calendar",
          cancelledBy: booking.userPrimaryEmail!,
          // Skip calendar event deletion to avoid infinite loops
          // (Google/Office365 → Cal.com → Google/Office365 → ...)
          skipCalendarSyncTaskCancellation: true,
        },
      });
      log.info("Successfully cancelled booking from calendar sync", { bookingUid });
    } catch (error) {
      // Log error but don't block - calendar change should still be reflected
      log.error("Failed to cancel booking from calendar sync", { bookingUid, error: safeStringify(error) });
    }
  }

  /**
   * Reschedule a booking
   * @param event
   */
  async rescheduleBooking(event: CalendarSubscriptionEventItem) {
    log.debug("rescheduleBooking", { event });
    const [bookingUid] = event.iCalUID?.split("@") ?? [undefined];
    if (!bookingUid) {
      log.debug("Unable to sync, booking UID not found in iCalUID");
      return;
    }

    const booking = await this.deps.bookingRepository.findBookingByUidWithEventType({ bookingUid });
    if (!booking) {
      log.debug("Unable to sync, booking not found in database", { bookingUid });
      return;
    }

    try {
      const regularBookingService = getRegularBookingService();
      await regularBookingService.createBooking({
        bookingData: {
          eventTypeId: booking.eventTypeId!,
          start: event.start?.toISOString() ?? booking.startTime.toISOString(),
          end: event.end?.toISOString() ?? booking.endTime.toISOString(),
          timeZone: event.timeZone ?? "UTC",
          language: "en",
          metadata: {},
          rescheduleUid: booking.uid,
        },
        bookingMeta: {
          // Skip calendar event creation to avoid infinite loops
          // (Google/Office365 → Cal.com → Google/Office365 → ...)
          skipCalendarSyncTaskCreation: true,
        },
      });
      log.info("Successfully rescheduled booking from calendar sync", { bookingUid });
    } catch (error) {
      // Log error but don't block - calendar change should still be reflected
      log.error("Failed to reschedule booking from calendar sync", { bookingUid, error: safeStringify(error) });
    }
  }
}
