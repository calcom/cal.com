import type { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { IdempotencyKeyService } from "@calcom/lib/idempotencyKey/idempotencyKeyService";
import logger from "@calcom/lib/logger";
import { BookingStatus } from "@calcom/prisma/enums";

import type { BookingSyncHandler, CancelAction, CalendarSyncEvent, RescheduleAction } from "./calendar-sync-service";

const log = logger.getSubLogger({ prefix: ["DefaultBookingSyncHandler"] });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extracts the booking UID from an iCalUID string.
 * Cal.com iCalUIDs follow the format `{bookingUid}@cal.com`.
 */
export function extractBookingUid(iCalUID: string): string | null {
  const [bookingUid] = iCalUID.split("@");
  return bookingUid || null;
}

/** The shape returned by `BookingRepository.findByUid` (bookingSyncSelect). */
type BookingFromSync = NonNullable<Awaited<ReturnType<BookingRepository["findByUid"]>>>;

/**
 * Detects whether the external calendar event changed metadata fields
 * (title, description, location) compared to the stored booking.
 */
function detectFieldChanges(
  booking: BookingFromSync,
  event: CalendarSyncEvent
): { changed: boolean; fields: { title?: string; description?: string | null; location?: string | null } } {
  const fields: { title?: string; description?: string | null; location?: string | null } = {};

  if (event.title !== undefined && event.title !== booking.title) {
    fields.title = event.title;
  }

  if (event.description !== undefined && (event.description ?? null) !== (booking.description ?? null)) {
    fields.description = event.description ?? null;
  }

  if (event.location !== undefined && (event.location ?? null) !== (booking.location ?? null)) {
    fields.location = event.location ?? null;
  }

  return { changed: Object.keys(fields).length > 0, fields };
}

/**
 * Extracts stored booking responses or builds a fallback from booking fields.
 * Mirrors `extractBookingResponses` in the production CalendarSyncService.
 */
function extractBookingResponses(booking: BookingFromSync): Record<string, unknown> {
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
}

/**
 * Merges the original booking responses with overrides from the external
 * calendar event (title, description, location).
 */
function mergeBookingResponsesWithEventData(
  booking: BookingFromSync,
  event: CalendarSyncEvent
): Record<string, unknown> {
  const baseResponses = extractBookingResponses(booking);
  const overrides: Record<string, unknown> = {};

  if (event.title !== undefined) {
    overrides.title = event.title;
  }

  if (event.description !== undefined) {
    overrides.notes = event.description;
  }

  if (event.location !== undefined) {
    overrides.location = event.location
      ? {
          value: event.location,
          label: event.location,
          optionValue: event.location,
        }
      : undefined;
  }

  return { ...baseResponses, ...overrides };
}

/**
 * Builds metadata from the external calendar event for the reschedule booking.
 */
function buildMetadataFromCalendarEvent(event: CalendarSyncEvent): Record<string, unknown> {
  const payload = {
    status: event.status ?? null,
    timeZone: event.timeZone ?? null,
    recurringEventId: event.recurringEventId ?? null,
    originalStartTime: event.originalStartTime?.toISOString() ?? null,
  };

  return {
    calendarSubscriptionEvent: JSON.stringify(payload),
  };
}

// ---------------------------------------------------------------------------
// DefaultBookingSyncHandler
// ---------------------------------------------------------------------------

/**
 * Default implementation of {@link BookingSyncHandler} that delegates to
 * the existing booking pipeline (`handleCancelBooking` for cancellations,
 * `getRegularBookingService` for reschedules).
 *
 * Fully compatible with the production CalendarSyncService in
 * `packages/features/calendar-subscription/lib/sync/CalendarSyncService.ts`,
 * including:
 * - Recurring event instance resolution via `findByRecurringEventIdAndStartTime`
 * - Unmodified recurring instance detection (originalStartTime === start)
 * - Recurring series collision check (fallback when originalStartTime unavailable)
 * - Duration preservation (external calendar controls "when", Cal.com controls "how long")
 * - Response merging from original booking
 * - Idempotency key generation
 * - Field sync (title, description, location) when only metadata changes
 */
export class DefaultBookingSyncHandler implements BookingSyncHandler {
  constructor(private readonly bookingRepository: BookingRepository) {}

  // ---------------------------------------------------------------------------
  // Shared preamble — extract UID, find booking, resolve recurring instance,
  // follow reschedule chain, validate ownership.
  // ---------------------------------------------------------------------------

  /**
   * Resolves the booking that a calendar event refers to.
   *
   * Steps:
   * 1. Extract booking UID from iCalUID
   * 2. Look up booking by UID
   * 3. Resolve correct recurring instance (if applicable)
   * 4. Safety guard: bail out if recurring instance couldn't be resolved
   * 5. Follow reschedule chain to the latest active booking
   * 6. Validate status (not cancelled) and ownership (userId match)
   *
   * @param opts.instanceTimeFallback — for cancel events the provider may not
   *   supply `originalStartTime`, so the caller passes `event.start` as fallback
   *   for recurring-instance resolution. For reschedule events pass `undefined`
   *   so that only explicit `originalStartTime` is used.
   *
   * Returns the resolved booking or `null` when any check fails (the method
   * logs the reason before returning).
   */
  private async resolveBooking(
    event: CalendarSyncEvent,
    calendarUserId: number,
    opts?: { instanceTimeFallback?: Date }
  ): Promise<BookingFromSync | null> {
    const bookingUid = extractBookingUid(event.iCalUID);
    if (!bookingUid) {
      log.debug("resolveBooking: no booking UID in iCalUID", { iCalUID: event.iCalUID });
      return null;
    }

    let booking = await this.bookingRepository.findByUid({ bookingUid });
    if (!booking) {
      log.debug("resolveBooking: booking not found", { bookingUid });
      return null;
    }

    // --- Recurring event instance resolution ---
    // For recurring bookings, all instances share the same iCalUID (from booking 1).
    // Use originalStartTime (or the caller-provided fallback) to resolve the correct instance.
    if (booking.recurringEventId) {
      const instanceStartTime = event.originalStartTime ?? opts?.instanceTimeFallback;
      if (instanceStartTime) {
        const correctInstance = await this.bookingRepository.findByRecurringEventIdAndStartTime({
          recurringEventId: booking.recurringEventId,
          startTime: instanceStartTime,
        });
        if (correctInstance && correctInstance.uid !== booking.uid) {
          const resolvedBooking = await this.bookingRepository.findByUid({
            bookingUid: correctInstance.uid,
          });
          if (resolvedBooking) {
            log.debug("resolveBooking: resolved recurring instance", {
              originalUid: bookingUid,
              resolvedUid: resolvedBooking.uid,
            });
            booking = resolvedBooking;
          }
        }
      }

      // If instance resolution didn't change the booking (still booking 1) but the event
      // refers to a different instance, bail out to avoid operating on the wrong booking.
      if (booking.uid === bookingUid) {
        const instanceStart = event.originalStartTime ?? opts?.instanceTimeFallback;
        if (instanceStart && instanceStart.getTime() !== booking.startTime.getTime()) {
          log.debug("resolveBooking: skipping, could not resolve correct recurring instance", {
            bookingUid,
            recurringEventId: booking.recurringEventId,
            instanceStartTime: instanceStart.toISOString(),
            bookingStartTime: booking.startTime.toISOString(),
          });
          return null;
        }
      }
    }

    // Follow reschedule chain BEFORE validation checks.
    // When a booking is rescheduled via Cal.com, the original has status=CANCELLED
    // and rescheduled=true. We must follow the chain to find the active booking
    // before checking status/userId — matching the production implementation.
    if (booking.rescheduled) {
      const latest = await this.bookingRepository.findLatestBookingInRescheduleChain({
        bookingUid: booking.uid,
      });
      if (latest) {
        log.debug("resolveBooking: resolved reschedule chain", {
          originalUid: booking.uid,
          latestUid: latest.uid,
        });
        booking = latest;
      }
    }

    if (booking.status === BookingStatus.CANCELLED) {
      log.debug("resolveBooking: booking already cancelled", { bookingUid: booking.uid });
      return null;
    }

    if (booking.userId !== calendarUserId) {
      log.debug("resolveBooking: calendar owner is not booking host", {
        bookingUid: booking.uid,
        calendarUserId,
        bookingUserId: booking.userId,
      });
      return null;
    }

    return booking;
  }

  // ---------------------------------------------------------------------------
  // Cancel
  // ---------------------------------------------------------------------------

  async cancelByICalUID(event: CalendarSyncEvent, calendarUserId: number): Promise<CancelAction> {
    const booking = await this.resolveBooking(event, calendarUserId, {
      instanceTimeFallback: event.start,
    });
    if (!booking) return "skipped";

    if (!booking.userPrimaryEmail) {
      log.warn("cancelByICalUID: booking missing userPrimaryEmail", { bookingUid: booking.uid });
      return "skipped";
    }

    // Dynamic import to avoid loading the entire booking pipeline at module evaluation time.
    const { default: handleCancelBooking } = await import(
      "@calcom/features/bookings/lib/handleCancelBooking"
    );

    await handleCancelBooking({
      userId: calendarUserId,
      actionSource: "SYSTEM",
      bookingData: {
        uid: booking.uid,
        cancellationReason: "Cancelled on user's calendar",
        cancelledBy: booking.userPrimaryEmail,
        // Skip calendar event deletion to avoid infinite loops
        skipCalendarSyncTaskCancellation: true,
      },
    });

    log.info("cancelByICalUID: booking cancelled successfully", { bookingUid: booking.uid });

    return "cancelled";
  }

  // ---------------------------------------------------------------------------
  // Reschedule
  // ---------------------------------------------------------------------------

  async rescheduleByICalUID(event: CalendarSyncEvent, calendarUserId: number): Promise<RescheduleAction> {
    const booking = await this.resolveBooking(event, calendarUserId);
    if (!booking) return "skipped";

    if (!booking.eventTypeId) {
      log.warn("rescheduleByICalUID: booking missing eventTypeId", { bookingUid: booking.uid });
      return "skipped";
    }

    // --- Time change detection ---
    const hasStartTimeChanged = event.start.getTime() !== booking.startTime.getTime();

    if (!hasStartTimeChanged) {
      // No time change — sync metadata fields if they changed, then return
      const updated = await this.updateBookingFields(booking, event);
      return updated ? "field_update" : "skipped";
    }

    // --- Unmodified recurring instance detection ---
    // For recurring bookings, if the provider reports originalStartTime === start,
    // the instance hasn't actually moved. This can happen when the provider fires
    // a notification for metadata-only changes on a recurring instance.
    if (
      booking.recurringEventId &&
      event.originalStartTime &&
      event.start &&
      event.originalStartTime.getTime() === event.start.getTime()
    ) {
      log.debug("rescheduleByICalUID: skipping unmodified recurring instance", {
        bookingUid: booking.uid,
        recurringEventId: booking.recurringEventId,
        eventStart: event.start.toISOString(),
      });
      // Still sync field changes even though time didn't move
      const updated = await this.updateBookingFields(booking, event);
      return updated ? "field_update" : "skipped";
    }

    // --- Recurring series collision check ---
    // Fallback for recurring bookings when originalStartTime is unavailable.
    // All instances share the same iCalUID. Without originalStartTime, check if
    // another booking in the series exists at the event's start time to avoid
    // false reschedules.
    if (booking.recurringEventId && event.start && !event.originalStartTime) {
      const existingBookingAtEventTime = await this.bookingRepository.findByRecurringEventIdAndStartTime({
        recurringEventId: booking.recurringEventId,
        startTime: event.start,
      });

      if (existingBookingAtEventTime) {
        log.debug("rescheduleByICalUID: event matches different booking in same recurring series", {
          bookingUid: booking.uid,
          recurringEventId: booking.recurringEventId,
          matchedBookingUid: existingBookingAtEventTime.uid,
        });
        return "skipped";
      }
    }

    // --- Build reschedule booking data ---
    // Preserve original booking duration — external calendar controls "when",
    // Cal.com controls "how long".
    const originalDurationMs = booking.endTime.getTime() - booking.startTime.getTime();
    const start = event.start.toISOString();
    const end = new Date(event.start.getTime() + originalDurationMs).toISOString();

    // Dynamic import to avoid loading the entire booking service chain at module evaluation time.
    const { getRegularBookingService } = await import(
      "@calcom/features/bookings/di/RegularBookingService.container"
    );
    const regularBookingService = getRegularBookingService();

    await regularBookingService.createBooking({
      bookingData: {
        eventTypeId: booking.eventTypeId,
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
      },
      bookingMeta: {
        // Skip calendar event creation to avoid infinite loops
        skipCalendarSyncTaskCreation: true,
        skipAvailabilityCheck: true,
        skipEventLimitsCheck: true,
        // Host-initiated reschedule from calendar — booker-facing time restrictions don't apply
        skipBookingTimeOutOfBoundsCheck: true,
      },
    });

    log.info("rescheduleByICalUID: booking rescheduled successfully", {
      bookingUid: booking.uid,
      newStart: start,
      newEnd: end,
    });

    return "rescheduled";
  }

  // ---------------------------------------------------------------------------
  // Field sync — updates booking metadata without rescheduling
  // ---------------------------------------------------------------------------

  /**
   * Updates booking fields (title, description, location) when the external
   * calendar event changed metadata without changing time.
   */
  private async updateBookingFields(booking: BookingFromSync, event: CalendarSyncEvent): Promise<boolean> {
    const { changed, fields } = detectFieldChanges(booking, event);

    if (!changed) {
      log.debug("updateBookingFields: no fields changed", { bookingUid: booking.uid });
      return false;
    }

    try {
      await this.bookingRepository.update({
        where: { uid: booking.uid },
        data: fields,
      });
      log.info("updateBookingFields: booking fields updated", {
        bookingUid: booking.uid,
        updatedFields: Object.keys(fields),
      });
      return true;
    } catch (error) {
      log.error("updateBookingFields: failed to update booking fields", {
        bookingUid: booking.uid,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }
}
