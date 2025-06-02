import { handleBookingTimeChange } from "@calcom/features/bookings/lib/handleBookingTimeChange";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import prisma from "@calcom/prisma";

import type { CancellationBySyncReason } from "../types";

const log = logger.getSubLogger({ prefix: ["calendar-sync", "downstream-actions"] });
export async function cancelBooking({
  bookingId,
  cancelledBy,
  cancellationReason,
}: {
  bookingId: number;
  cancelledBy: string;
  cancellationReason: CancellationBySyncReason;
}) {
  const response = await handleCancelBooking({
    bookingData: { id: bookingId, cancellationReason, cancelledBy },

    // It is being cancelled via Sync, so we don't have a userId
    userId: undefined,
  });
  if (!response.success) {
    throw new Error(`Failed to cancel booking ${bookingId}: ${response.message}`);
  }
}

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
  const currentBooking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      eventType: {
        select: {
          id: true,
          slug: true,
          length: true,
        },
      },
      attendees: true,
      user: {
        select: {
          username: true,
        },
      },
    },
  });

  if (!currentBooking) {
    throw new Error(`Booking with ID ${bookingId} not found`);
  }

  if (!currentBooking.eventType) {
    throw new Error(`Event type not found for booking ${bookingId}`);
  }

  // Get the primary attendee (booker)
  const primaryAttendee = currentBooking.attendees[0];
  if (!primaryAttendee) {
    throw new Error(`No attendees found for booking ${bookingId}`);
  }

  // TODO: We could add availability checking here to prevent conflicts
  // This would involve checking if the new time slot is available for the organizer
  // For now, we implement the basic reschedule functionality as requested

  try {
    const rescheduleResult = await handleBookingTimeChange({
      bookingUid: currentBooking.uid,
      startTime,
      endTime,
      rescheduledBy,
      rescheduleReason: "Rescheduled via calendar sync",
    });

    return rescheduleResult;
  } catch (error) {
    log.error("Failed to reschedule booking", { bookingId }, safeStringify(error));
    throw new Error(
      `Failed to reschedule booking ${bookingId}: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
