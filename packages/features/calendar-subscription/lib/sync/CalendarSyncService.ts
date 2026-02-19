import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import { WorkflowRepository } from "@calcom/features/ee/workflows/repositories/WorkflowRepository";
import {
  cancelNoShowTasksForBooking,
  deleteWebhookScheduledTriggers,
} from "@calcom/features/webhooks/lib/scheduleTrigger";
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

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
      log.debug("Unable to sync, booking UID not found");
      return;
    }

    const booking = await this.deps.bookingRepository.findByUidIncludeEventTypeAndWorkflowReminders({
      bookingUid,
    });
    if (!booking) {
      log.debug("Unable to sync, booking not found", { bookingUid });
      return;
    }

    if (booking.status === BookingStatus.CANCELLED) {
      log.debug("Booking already cancelled, skipping", { bookingUid });
      return;
    }

    if (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.AWAITING_HOST) {
      log.debug("Booking is not confirmed yet, skipping cancellation", {
        bookingUid,
        status: booking.status,
      });
      return;
    }

    if (booking.eventType?.disableCancelling) {
      log.debug("Event type has cancellation disabled, skipping", { bookingUid });
      return;
    }

    await this.deps.bookingRepository.update({
      where: { id: booking.id },
      data: {
        status: BookingStatus.CANCELLED,
        cancellationReason: "Cancelled via Google Calendar",
        iCalSequence: booking.iCalSequence + 1,
      },
    });

    try {
      await Promise.allSettled([
        deleteWebhookScheduledTriggers({ booking: { id: booking.id, uid: booking.uid } }),
        cancelNoShowTasksForBooking({ bookingUid: booking.uid }),
        ...(booking.workflowReminders.length > 0
          ? [WorkflowRepository.deleteAllWorkflowReminders(booking.workflowReminders)]
          : []),
      ]).then((results) => {
        const rejectedReasons = results
          .filter((result): result is PromiseRejectedResult => result.status === "rejected")
          .map((result) => result.reason);

        if (rejectedReasons.length > 0) {
          log.error("Error cleaning up workflow reminders and webhook triggers", rejectedReasons);
        }
      });
    } catch (error) {
      log.error("Error during cancellation cleanup", { error });
    }

    log.info("Booking cancelled via calendar sync", { bookingUid });
  }

  /**
   * Reschedule a booking
   * @param event
   */
  async rescheduleBooking(event: CalendarSubscriptionEventItem) {
    log.debug("rescheduleBooking", { event });
    const [bookingUid] = event.iCalUID?.split("@") ?? [undefined];
    if (!bookingUid) {
      log.debug("Unable to sync, booking UID not found");
      return;
    }

    const booking = await this.deps.bookingRepository.findByUidIncludeEventTypeAndWorkflowReminders({
      bookingUid,
    });
    if (!booking) {
      log.debug("Unable to sync, booking not found", { bookingUid });
      return;
    }

    if (booking.status === BookingStatus.CANCELLED) {
      log.debug("Booking is cancelled, skipping reschedule", { bookingUid });
      return;
    }

    if (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.AWAITING_HOST) {
      log.debug("Booking is not confirmed yet, skipping reschedule", {
        bookingUid,
        status: booking.status,
      });
      return;
    }

    if (booking.eventType?.disableRescheduling) {
      log.debug("Event type has rescheduling disabled, skipping", { bookingUid });
      return;
    }

    const title = event.summary ?? booking.title;

    await this.deps.bookingRepository.update({
      where: { id: booking.id },
      data: {
        title,
        startTime: event.start,
        endTime: event.end,
        iCalSequence: booking.iCalSequence + 1,
      },
    });

    log.info("Booking rescheduled via calendar sync", { bookingUid });
  }
}
