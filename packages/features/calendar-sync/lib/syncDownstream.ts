import dayjs from "@calcom/dayjs";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BookingReferenceRepository } from "@calcom/lib/server/repository/bookingReference";
import type { Booking } from "@calcom/prisma/client";
import type { CalendarEventsToSync } from "@calcom/types/Calendar";

import type { CancellationBySyncReason } from "../types";
import { cancelBooking } from "./downstreamActions";

const log = logger.getSubLogger({ prefix: ["CalendarSync"] });

// Define complex types for function parameters
type BookingDataForSync = Pick<Booking, "id" | "startTime" | "endTime" | "status"> | null;
type ReasonCode =
  | "NO_BOOKING_FOUND"
  | "BOOKING_NOT_ACCEPTED"
  | "BOOKING_ALREADY_CANCELLED"
  | "NEW_TIME_IN_PAST"
  | "NO_TIME_CHANGE";

type BookingUpdateAction =
  | { type: "NO_CHANGE"; bookingId?: number; reason: { code: ReasonCode; message: string }; notes?: string[] }
  // There is a change in the calendar event, but we are ignoring it for some reason
  | {
      type: "IGNORE_CHANGE";
      bookingId: number;
      reason: { code: ReasonCode; message: string };
      notes?: string[];
    }
  | {
      type: "CANCEL_BOOKING";
      bookingId: number;
      cancelledBy: string;
      cancellationReason: CancellationBySyncReason;
      notes?: string[];
    }
  | {
      type: "UPDATE_BOOKING_TIMES";
      bookingId: number;
      startTime: Date;
      endTime: Date;
      rescheduledBy: string;
      notes?: string[];
    };

type getBookingUpdateActionsParams = {
  calendarEvent: CalendarEventsToSync[number];
  booking: BookingDataForSync;
  appName: string;
};

/**
 * We are starting with a very restrictive approach to avoid unexpected updates in Cal.com bookings from Calendar Events.
 * Returns an array of actions to be performed on the booking based on calendar event changes.
 */
export function getBookingUpdateActions({
  calendarEvent,
  booking,
  appName,
}: getBookingUpdateActionsParams): BookingUpdateAction[] {
  const calendarEventId = calendarEvent.id;
  const actions: BookingUpdateAction[] = [];

  if (!booking) {
    actions.push({
      type: "NO_CHANGE",
      reason: {
        code: "NO_BOOKING_FOUND",
        message: `No Cal.com booking found for Calendar Event ${calendarEventId}.`,
      },
    });
    return actions;
  }

  // Don't make any changes if the booking is already cancelled
  if (booking.status !== "ACCEPTED") {
    actions.push({
      type: "IGNORE_CHANGE",
      bookingId: booking.id,
      reason: {
        code: "BOOKING_NOT_ACCEPTED",
        message: `Booking ${booking.id} is not ACCEPTED in Cal.com, so we are not making any changes.`,
      },
    });
    return actions;
  }

  if (calendarEvent.status === "cancelled" || calendarEvent.organizerResponseStatus === "declined") {
    // Cancel the booking, we know here that the booking is ACCEPTED, so we should cancel
    actions.push({
      type: "CANCEL_BOOKING",
      bookingId: booking.id,
      cancelledBy: appName,
      cancellationReason:
        calendarEvent.organizerResponseStatus === "declined"
          ? "organizer_declined_in_calendar"
          : "event_cancelled_in_calendar",
      notes: ["Ignoring every other change as the booking has been cancelled"],
    });
    // If a booking is being cancelled, we don't need to make any other changes. We could even skip the changes in the calendar event time
    return actions;
  }

  const calendarEventStartTime = dayjs(calendarEvent.startTime);
  const calendarEventEndTime = dayjs(calendarEvent.endTime);
  const bookingStartTime = dayjs(booking.startTime);
  const bookingEndTime = dayjs(booking.endTime);

  if (!calendarEventStartTime.isSame(bookingStartTime) || !calendarEventEndTime.isSame(bookingEndTime)) {
    if (calendarEventEndTime.isBefore(dayjs())) {
      actions.push({
        type: "IGNORE_CHANGE",
        bookingId: booking.id,
        reason: {
          code: "NEW_TIME_IN_PAST",
          message: `Calendar Event ${calendarEventId} time change is in the past. Skipping update.`,
        },
      });
    } else {
      actions.push({
        type: "UPDATE_BOOKING_TIMES",
        bookingId: booking.id,
        startTime: calendarEventStartTime.toDate(),
        endTime: calendarEventEndTime.toDate(),
        rescheduledBy: appName,
      });
    }
  } else {
    actions.push({
      type: "NO_CHANGE",
      bookingId: booking.id,
      reason: {
        code: "NO_TIME_CHANGE",
        message: `No time change detected for booking ${booking.id}.`,
      },
    });
  }

  return actions;
}

function getBookingMap(bookingReferences: { uid: string | null; booking: BookingDataForSync }[]) {
  const bookingWithSameCalendarEventId = new Map<string, NonNullable<BookingDataForSync>[]>();
  bookingReferences.forEach((ref) => {
    if (ref.uid && ref.booking) {
      const existingBookingsInMap = bookingWithSameCalendarEventId.get(ref.uid) || [];
      // We could have multiple bookings having same calendarEventId due to reschedules as reschedule creates a new booking but it could be still connected to the same calendarEvent
      bookingWithSameCalendarEventId.set(ref.uid, [...existingBookingsInMap, ref.booking]);
    }
  });

  const bookingMap = new Map<string, BookingDataForSync>();
  bookingWithSameCalendarEventId.forEach((bookings, calendarEventId) => {
    if (bookings.length === 1) {
      bookingMap.set(calendarEventId, bookings[0]);
    } else {
      // A booking that is rescheduled is cancelled and a new one is created, so we could rely on the CANCELLED status
      const nonCancelledBookings = bookings.filter((b) => b.status !== "CANCELLED");
      if (nonCancelledBookings.length === 1) {
        bookingMap.set(calendarEventId, nonCancelledBookings[0]);
      } else {
        log.warn(
          `Multiple non-cancelled bookings found for Calendar Event ${calendarEventId}. Using first one, but it should be investigated.`
        );
        bookingMap.set(calendarEventId, nonCancelledBookings[0]);
      }
    }
  });
  return bookingMap;
}

export async function syncDownstream({
  calendarEvents,
  app,
}: {
  calendarEvents: CalendarEventsToSync;
  app: {
    type: "google_calendar";
    name: "Google Calendar";
  };
}) {
  if (!calendarEvents.length) {
    log.debug("No calendar events to sync.");
    return [];
  }

  try {
    const calendarEventIds = calendarEvents.map((event) => event.id).filter(Boolean) as string[];

    const bookingReferences = await BookingReferenceRepository.findManyWhereUidsAndTypeIncludeBooking({
      uids: calendarEventIds,
      type: app.type,
    });

    const bookingMap = getBookingMap(bookingReferences);

    const results = [];
    for (const calendarEvent of calendarEvents) {
      try {
        const booking = bookingMap.get(calendarEvent.id) || null;
        if (!booking) {
          // The calendar event wasn't created in Cal.com, so we don't need to sync it
          log.error(
            `No booking found for Calendar Event ${calendarEvent.id}. Nothing to sync for this event.`
          );
          continue;
        }
        const actions = getBookingUpdateActions({ calendarEvent, booking, appName: app.name });

        for (const action of actions) {
          const dbUpdatePromise: Promise<unknown> = Promise.resolve(); // Default to no DB operation

          switch (action.type) {
            case "CANCEL_BOOKING":
              log.info(
                `Calendar Event ${calendarEvent.id} triggered CANCEL for Cal.com booking ${action.bookingId}.`
              );
              await cancelBooking({
                bookingId: action.bookingId,
                cancelledBy: action.cancelledBy,
                cancellationReason: action.cancellationReason,
              });
              break;
            case "UPDATE_BOOKING_TIMES":
              log.debug(
                `Calendar Event ${calendarEvent.id} has time change, but it is ignored temporarily for booking ${action.bookingId}.`,
                safeStringify({
                  newStart: action.startTime,
                  newEnd: action.endTime,
                })
              );
              // TODO: To be enabled in a follow up PR
              // dbUpdatePromise = prisma.booking.update({
              //   where: { id: action.bookingId },
              //   data: {
              //     startTime: action.startTime,
              //     endTime: action.endTime,
              //     rescheduledBy: action.rescheduledBy,
              //   },
              // });
              break;
            case "NO_CHANGE":
            case "IGNORE_CHANGE":
              log.debug(
                `No action needed for Calendar Event ${calendarEvent.id}${
                  action.bookingId ? ` (Booking ID: ${action.bookingId})` : ""
                }: ${action.reason.message} (${action.type})`
              );
              break;
            default:
              const unhandledAction: never = action;
              throw new Error(`Unhandled action: ${unhandledAction}`);
          }
          // Wait for the DB operation to complete (if any)
          const updateResult = await dbUpdatePromise;
          results.push({ status: "success" as const, value: updateResult, action }); // Include action for context
        }
      } catch (e) {
        log.error(`Error processing Calendar Event ${calendarEvent.id} during sync: ${safeStringify(e)}`);
        results.push({ status: "error" as const, reason: e, calendarEventId: calendarEvent.id });
      }
    }

    return results.map((result) => {
      if (result.status === "error") {
        return { status: "error" as const, values: null, errorDetails: result.reason };
      }
      // Value from dbUpdatePromise can be booking data or undefined for NO_ACTION
      return { status: "success" as const, values: result.value, action: result.action };
    });
  } catch (error) {
    log.error("Error in syncEvents main try-catch block", safeStringify(error));
    return calendarEvents.map((event) => ({
      status: "error" as const,
      values: null,
      errorDetails: error,
      calendarEventId: event.id,
    }));
  }
}
