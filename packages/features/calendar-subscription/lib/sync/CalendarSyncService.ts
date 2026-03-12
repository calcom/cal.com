import type { CreateRegularBookingData } from "@calcom/features/bookings/lib/dto/types";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import type { CalendarSubscriptionEventItem } from "@calcom/features/calendar-subscription/lib/CalendarSubscriptionPort.interface";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
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
      let booking = await this.deps.bookingRepository.findBookingByUidWithEventType({ bookingUid });
      if (!booking) {
        log.debug("Unable to sync, booking not found in database", { bookingUid });
        return;
      }

      // The iCalUID references the original booking, but it may have been rescheduled already.
      // Follow the reschedule chain to find the latest active booking so we compare
      // against the correct startTime and reschedule from the right booking.
      if (booking.rescheduled) {
        const latestBooking = await this.deps.bookingRepository.findLatestBookingInRescheduleChain({
          bookingUid,
        });
        if (latestBooking) {
          log.debug("Resolved reschedule chain to latest booking", {
            originalUid: bookingUid,
            latestUid: latestBooking.uid,
          });
          booking = latestBooking;
        }
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
        await this.updateBookingFields(booking, event);
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
          // Host-initiated reschedule from calendar — booker-facing time restrictions don't apply
          skipBookingTimeOutOfBoundsCheck: true,
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

  /**
   * Updates booking fields (title, description, location) when the external calendar
   * event changed metadata without changing time.
   */
  async updateBookingFields(booking: BookingWithEventType, event: CalendarSubscriptionEventItem) {
    const startTime = performance.now();
    const { changed, fields } = hasFieldsChanged(booking, event);

    if (!changed) {
      log.debug("Skipping field update, no fields changed", { bookingUid: booking.uid });
      metrics.count("calendar.sync.updateBookingFields.calls", 1, {
        attributes: { status: "skipped", reason: "no_changes" },
      });
      return;
    }

    try {
      await this.deps.bookingRepository.update({
        where: { uid: booking.uid },
        data: fields,
      });
      log.info("Successfully updated booking fields from calendar sync", {
        bookingUid: booking.uid,
        updatedFields: Object.keys(fields),
      });

      metrics.count("calendar.sync.updateBookingFields.calls", 1, {
        attributes: { status: "success" },
      });
      metrics.distribution("calendar.sync.updateBookingFields.duration_ms", performance.now() - startTime, {
        attributes: { status: "success" },
      });
    } catch (error) {
      log.error("Failed to update booking fields from calendar sync", {
        bookingUid: booking.uid,
        error: safeStringify(error),
      });

      metrics.count("calendar.sync.updateBookingFields.calls", 1, {
        attributes: { status: "error" },
      });
      metrics.distribution("calendar.sync.updateBookingFields.duration_ms", performance.now() - startTime, {
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

export const hasFieldsChanged = (
  booking: BookingWithEventType,
  event: CalendarSubscriptionEventItem
): {
  changed: boolean;
  fields: { title?: string; description?: string | null; location?: string | null };
} => {
  const fields: { title?: string; description?: string | null; location?: string | null } = {};

  if (event.summary && event.summary !== booking.title) {
    fields.title = event.summary;
  }

  if (event.description !== undefined && (event.description ?? null) !== (booking.description ?? null)) {
    fields.description = event.description;
  }

  if (event.location !== undefined && (event.location ?? null) !== (booking.location ?? null)) {
    fields.location = event.location;
  }

  return { changed: Object.keys(fields).length > 0, fields };
};
