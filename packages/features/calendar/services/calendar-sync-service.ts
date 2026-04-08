import type { CalendarEvent } from "@calcom/calendar-adapter/calendar-adapter-types";
import logger from "@calcom/lib/logger";
import type { SelectedCalendar } from "@calcom/prisma/client";

const log = logger.getSubLogger({ prefix: ["CalendarSyncService"] });

const CAL_COM_ICAL_SUFFIX = "@cal.com";

export interface BookingSyncResult {
  total: number;
  synced: number;
  cancelled: number;
  rescheduled: number;
  fieldUpdates: number;
  errors: number;
}

/**
 * Enriched calendar event passed to the booking sync handler.
 * Extends the adapter's CalendarEvent with the fields required for
 * recurring-event instance resolution and field sync.
 */
export interface CalendarSyncEvent {
  /** The raw iCalUID (or uid fallback) from the external calendar */
  iCalUID: string;
  status: CalendarEvent["status"];
  start: Date;
  end: Date;
  /** Title / summary from the external calendar */
  title?: string;
  /** Description from the external calendar */
  description?: string;
  /** Location from the external calendar */
  location?: string;
  /** Timezone from the external calendar */
  timeZone?: string;
  /** Provider's recurring event series ID (Google: recurringEventId) */
  recurringEventId?: string | null;
  /** Original start time for modified recurring instances */
  originalStartTime?: Date | null;
}

/** Describes what action the handler took for a cancel event. */
export type CancelAction = "cancelled" | "skipped";

/** Describes what action the handler took for a reschedule event. */
export type RescheduleAction = "rescheduled" | "field_update" | "skipped";

/**
 * Handler interface for booking operations triggered by calendar sync.
 * Implementations handle the actual booking cancellation, rescheduling,
 * and field sync logic, including UID extraction, ownership validation,
 * recurring instance resolution, and delegation to the booking pipeline.
 */
export interface BookingSyncHandler {
  /**
   * Cancel a booking identified by its iCalUID.
   * The implementation extracts the booking UID from the iCalUID,
   * validates ownership against calendarUserId, resolves recurring
   * instances, and performs the cancellation through the booking pipeline.
   */
  cancelByICalUID(event: CalendarSyncEvent, calendarUserId: number): Promise<CancelAction>;

  /**
   * Reschedule a booking identified by its iCalUID to new start/end times.
   * The implementation extracts the booking UID from the iCalUID,
   * validates ownership, resolves recurring instances, compares against
   * stored times, preserves original booking duration, and creates
   * a replacement booking if the time has changed. If only metadata
   * changed (title/description/location) without a time change, the
   * implementation updates those fields directly.
   *
   * Returns the action taken so the caller can update counters accurately.
   */
  rescheduleByICalUID(event: CalendarSyncEvent, calendarUserId: number): Promise<RescheduleAction>;
}

export interface CalendarSyncServiceDeps {
  bookingHandler?: BookingSyncHandler;
}

export class CalendarSyncService {
  private readonly bookingHandler?: BookingSyncHandler;

  constructor(deps?: CalendarSyncServiceDeps) {
    this.bookingHandler = deps?.bookingHandler;
  }

  async handleEvents(
    selectedCalendar: Pick<SelectedCalendar, "id" | "userId">,
    events: CalendarEvent[]
  ): Promise<BookingSyncResult> {
    const result: BookingSyncResult = {
      total: 0,
      synced: 0,
      cancelled: 0,
      rescheduled: 0,
      fieldUpdates: 0,
      errors: 0,
    };

    let calEvents: CalendarEvent[];
    try {
      calEvents = events.filter((e) => (e.iCalUID ?? e.uid)?.toLowerCase().endsWith(CAL_COM_ICAL_SUFFIX));
    } catch (err) {
      log.error("handleEvents: failed to filter Cal.com events", {
        selectedCalendarId: selectedCalendar.id,
        error: err instanceof Error ? err.message : String(err),
      });
      return result;
    }

    result.total = calEvents.length;

    if (calEvents.length === 0) {
      log.info("handleEvents: no Cal.com events to process");
      return result;
    }

    log.info("handleEvents: Cal.com events detected", {
      selectedCalendarId: selectedCalendar.id,
      total: events.length,
      calcomEvents: calEvents.length,
    });

    for (const event of calEvents) {
      try {
        const iCalUID = event.iCalUID ?? event.uid;

        const syncEvent: CalendarSyncEvent = {
          iCalUID,
          status: event.status,
          start: event.start,
          end: event.end,
          title: event.title,
          description: event.description,
          location: event.location,
          timeZone: event.timeZone,
          recurringEventId: event.recurringEventId,
          originalStartTime: event.originalStartTime,
        };

        if (event.status === "cancelled") {
          log.info("handleEvents: booking cancellation needed", {
            uid: event.uid,
            iCalUID: event.iCalUID,
          });

          if (this.bookingHandler) {
            const action = await this.bookingHandler.cancelByICalUID(syncEvent, selectedCalendar.userId);
            if (action === "cancelled") {
              result.cancelled++;
            }
          }

          result.synced++;
          continue;
        }

        if (event.status === "confirmed" || event.status === "tentative") {
          log.info("handleEvents: potential booking reschedule", {
            uid: event.uid,
            status: event.status,
            iCalUID: event.iCalUID,
            start: event.start.toISOString(),
            end: event.end.toISOString(),
          });

          if (this.bookingHandler) {
            const action = await this.bookingHandler.rescheduleByICalUID(syncEvent, selectedCalendar.userId);
            if (action === "field_update") {
              result.fieldUpdates++;
            } else if (action === "rescheduled") {
              result.rescheduled++;
            }
          }

          result.synced++;
          continue;
        }

        log.info("handleEvents: skipping event with unhandled status", {
          uid: event.uid,
          status: event.status,
        });
      } catch (err) {
        log.error("handleEvents: error processing event", {
          uid: event.uid,
          iCalUID: event.iCalUID,
          error: err instanceof Error ? err.message : String(err),
        });
        result.errors++;
      }
    }

    return result;
  }
}
