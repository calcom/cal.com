import handleNewBooking from "@calcom/features/bookings/lib/handleNewBooking";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { getTranslation } from "@calcom/lib/server/i18n";
import { BookingRepository } from "@calcom/lib/server/repository/booking";

const log = logger.getSubLogger({ prefix: ["DownstreamActions"] });

export async function rescheduleBooking({
  bookingId,
  startTime,
  endTime,
  rescheduledBy,
}: {
  bookingId: number;
  startTime: Date;
  endTime: Date;
  rescheduledBy: string;
}) {
  // First, get the current booking details to create the reschedule request
  const booking = await BookingRepository.findBookingByIdForReschedule({ bookingId });
  if (!booking) {
    throw new Error(`Booking with ID ${bookingId} not found`);
  }

  if (!booking.eventType) {
    throw new Error(`Event type not found for booking ${bookingId}`);
  }

  const bookerAttendee = booking.bookerAttendee;
  if (!bookerAttendee) {
    throw new Error(`No attendees found for booking ${bookingId}`);
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
    log.error("Failed to reschedule booking", { bookingId }, safeStringify(error));
    throw new Error(
      `Failed to reschedule booking ${bookingId}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

async function handleBookingTimeChange({
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
    responses: Record<string, any> & {
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
