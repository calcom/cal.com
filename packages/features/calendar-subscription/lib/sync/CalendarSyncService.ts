import type { CreateRegularBookingData } from "@calcom/features/bookings/lib/dto/types";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { SelectedCalendar } from "@calcom/prisma/client";
import { metrics } from "@sentry/nextjs";

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

    metrics.count("calendar.sync.handleEvents.calls", 1, {
      attributes: {
        integration: selectedCalendar.integration,
      },
    });

    // only process cal.com calendar events
    const calEvents = calendarSubscriptionEvents.filter((e) =>
      e.iCalUID?.toLowerCase()?.endsWith("@cal.com")
    );

    metrics.distribution("calendar.sync.handleEvents.events_count", calEvents.length, {
      attributes: {
        integration: selectedCalendar.integration,
      },
    });

    if (calEvents.length === 0) {
      log.debug("handleEvents: no calendar events to process");
      return;
    }

    log.debug("handleEvents: processing calendar events", { count: calEvents.length });

    await Promise.all(
      calEvents.map((e) => {
        if (e.status === "cancelled") {
          return this.cancelBooking(e, selectedCalendar.userId);
        } else {
          return this.rescheduleBooking(e, selectedCalendar.userId);
        }
      })
    );
  }

  /**
   * Cancels a booking
   * @param event
   * @returns
   */
  async cancelBooking(event: CalendarSubscriptionEventItem, calendarUserId: number) {
    const startTime = performance.now();
    log.debug("cancelBooking", { event });
    const [bookingUid] = event.iCalUID?.split("@") ?? [undefined];
    if (!bookingUid) {
      log.debug("Unable to sync, booking UID not found in iCalUID");
      return;
    }

    try {
      const booking = await this.deps.bookingRepository.findBookingByUidWithEventType({ bookingUid });
      if (!booking) {
        log.debug("Unable to sync, booking not found in database", { bookingUid });
        return;
      }

      if (booking.userId !== calendarUserId) {
        log.debug("Skipping sync, calendar owner is not the booking host", {
          bookingUid,
          calendarUserId,
          bookingUserId: booking.userId,
        });
        metrics.count("calendar.sync.cancelBooking.calls", 1, {
          attributes: { status: "skipped", reason: "not_booking_host" },
        });
        return;
      }

      if (!booking.userId || !booking.userPrimaryEmail) {
        log.warn("Unable to sync cancellation, booking missing required user data", {
          bookingUid,
          hasUserId: !!booking.userId,
          hasUserPrimaryEmail: !!booking.userPrimaryEmail,
        });
        metrics.count("calendar.sync.cancelBooking.calls", 1, {
          attributes: { status: "skipped", reason: "missing_user_data" },
        });
        return;
      }

      await handleCancelBooking({
        userId: booking.userId,
        actionSource: "SYSTEM",
        bookingData: {
          uid: booking.uid,
          cancellationReason: "Cancelled on user's calendar",
          cancelledBy: booking.userPrimaryEmail,
          // Skip calendar event deletion to avoid infinite loops
          // (Google/Office365 → Cal.com → Google/Office365 → ...)
          skipCalendarSyncTaskCancellation: true,
        },
      });
      log.info("Successfully cancelled booking from calendar sync", { bookingUid });

      metrics.count("calendar.sync.cancelBooking.calls", 1, {
        attributes: { status: "success" },
      });
      metrics.distribution("calendar.sync.cancelBooking.duration_ms", performance.now() - startTime, {
        attributes: { status: "success" },
      });
    } catch (error) {
      log.error("Failed to cancel booking from calendar sync", { bookingUid, error: safeStringify(error) });

      metrics.count("calendar.sync.cancelBooking.calls", 1, {
        attributes: { status: "error" },
      });
      metrics.distribution("calendar.sync.cancelBooking.duration_ms", performance.now() - startTime, {
        attributes: { status: "error" },
      });
    }
  }

  /**
   * Reschedule a booking
   * @param event
   */
  async rescheduleBooking(event: CalendarSubscriptionEventItem, calendarUserId: number) {
    const startTime = performance.now();
    log.debug("rescheduleBooking", { event });
    const [bookingUid] = event.iCalUID?.split("@") ?? [undefined];
    if (!bookingUid) {
      log.debug("Unable to sync, booking UID not found in iCalUID");
      return;
    }

    try {
      const booking = await this.deps.bookingRepository.findBookingByUidWithEventType({ bookingUid });
      if (!booking) {
        log.debug("Unable to sync, booking not found in database", { bookingUid });
        return;
      }

      if (booking.userId !== calendarUserId) {
        log.debug("Skipping sync, calendar owner is not the booking host", {
          bookingUid,
          calendarUserId,
          bookingUserId: booking.userId,
        });
        metrics.count("calendar.sync.rescheduleBooking.calls", 1, {
          attributes: { status: "skipped", reason: "not_booking_host" },
        });
        return;
      }

      if (!booking.eventTypeId) {
        log.warn("Unable to sync reschedule, booking missing eventTypeId", { bookingUid });
        metrics.count("calendar.sync.rescheduleBooking.calls", 1, {
          attributes: { status: "skipped", reason: "missing_event_type_id" },
        });
        return;
      }

      if (!hasStartTimeChanged(booking, event)) {
        log.debug("Skipping reschedule, start time has not changed", { bookingUid });
        metrics.count("calendar.sync.rescheduleBooking.calls", 1, {
          attributes: { status: "skipped", reason: "no_time_change" },
        });
        return;
      }

      // Dynamic import to avoid loading the entire booking service chain at module evaluation time
      // This prevents react-awesome-query-builder from being loaded in server-side contexts
      const { getRegularBookingService } = await import(
        "@calcom/features/bookings/di/RegularBookingService.container"
      );
      const regularBookingService = getRegularBookingService();
      await regularBookingService.createBooking({
        bookingData: buildRescheduleBookingData(booking, event),
        bookingMeta: {
          // Skip calendar event creation to avoid infinite loops
          // (Google/Office365 → Cal.com → Google/Office365 → ...)
          skipCalendarSyncTaskCreation: true,
          skipAvailabilityCheck: true,
          skipEventLimitsCheck: true,
        },
      });
      log.info("Successfully rescheduled booking from calendar sync", { bookingUid });

      metrics.count("calendar.sync.rescheduleBooking.calls", 1, {
        attributes: { status: "success" },
      });
      metrics.distribution("calendar.sync.rescheduleBooking.duration_ms", performance.now() - startTime, {
        attributes: { status: "success" },
      });
    } catch (error) {
      log.error("Failed to reschedule booking from calendar sync", {
        bookingUid,
        error: safeStringify(error),
      });

      metrics.count("calendar.sync.rescheduleBooking.calls", 1, {
        attributes: { status: "error" },
      });
      metrics.distribution("calendar.sync.rescheduleBooking.duration_ms", performance.now() - startTime, {
        attributes: { status: "error" },
      });
    }
  }
}

export type BookingWithEventType = NonNullable<
  Awaited<ReturnType<BookingRepository["findBookingByUidWithEventType"]>>
>;

type RescheduleBookingData = CreateRegularBookingData & {
  responses: Record<string, unknown>;
  idempotencyKey: string;
};

export const buildRescheduleBookingData = (
  booking: BookingWithEventType,
  event: CalendarSubscriptionEventItem
): RescheduleBookingData => {
  const fallbackStart = booking.startTime.toISOString();
  const start = event.start?.toISOString() ?? fallbackStart;

  // Keep the original booking duration — external calendar controls "when", Cal.com controls "how long"
  const originalDurationMs = booking.endTime.getTime() - booking.startTime.getTime();
  const end = new Date(new Date(start).getTime() + originalDurationMs).toISOString();

  return {
    eventTypeId: booking.eventTypeId!,
    start,
    end,
    timeZone: event.timeZone ?? "UTC",
    language: "en",
    metadata: buildMetadataFromCalendarEvent(event),
    rescheduleUid: booking.uid,
    idempotencyKey: IdempotencyKeyService.generate({
      startTime: new Date(start),
      endTime: new Date(end),
      userId: booking.userId ?? undefined,
      reassignedById: null,
    }),
    responses: mergeBookingResponsesWithEventData(booking, event),
  };
};

export const extractBookingResponses = (booking: BookingWithEventType): Record<string, unknown> => {
  const rawResponses = booking.responses;
  if (rawResponses && typeof rawResponses === "object" && !Array.isArray(rawResponses)) {
    return rawResponses as Record<string, unknown>;
  }

  const fallbackLocation = booking.location ?? "";

  return {
    name: booking.title,
    email: booking.userPrimaryEmail ?? "",
    guests: [],
    notes: booking.description ?? "",
    smsReminderNumber: booking.smsReminderNumber ?? undefined,
    location: fallbackLocation
      ? {
          label: fallbackLocation,
          value: fallbackLocation,
          optionValue: fallbackLocation,
        }
      : undefined,
  };
};

export const mergeBookingResponsesWithEventData = (
  booking: BookingWithEventType,
  event: CalendarSubscriptionEventItem
): Record<string, unknown> => {
  const baseResponses = extractBookingResponses(booking);
  const overrides: Record<string, unknown> = {};

  if (event.summary) {
    overrides.title = event.summary;
  }

  if (event.description) {
    overrides.notes = event.description;
  }

  if (event.location) {
    overrides.location = {
      value: event.location,
      label: event.location,
      optionValue: event.location,
    };
  }

  return {
    ...baseResponses,
    ...overrides,
  };
};

export const buildMetadataFromCalendarEvent = (event: CalendarSubscriptionEventItem) => {
  const payload = {
    summary: event.summary ?? null,
    description: event.description ?? null,
    location: event.location ?? null,
    busy: event.busy ?? null,
    status: event.status ?? null,
    isAllDay: event.isAllDay ?? null,
    timeZone: event.timeZone ?? null,
    recurringEventId: event.recurringEventId ?? null,
    originalStartDate: event.originalStartDate?.toISOString() ?? null,
    createdAt: event.createdAt?.toISOString() ?? null,
    updatedAt: event.updatedAt?.toISOString() ?? null,
    etag: event.etag ?? null,
    kind: event.kind ?? null,
  };

  return {
    calendarSubscriptionEvent: JSON.stringify(payload),
  };
};

export const hasStartTimeChanged = (
  booking: BookingWithEventType,
  event: CalendarSubscriptionEventItem
): boolean => {
  if (!event.start) return false;
  return event.start.getTime() !== booking.startTime.getTime();
};
