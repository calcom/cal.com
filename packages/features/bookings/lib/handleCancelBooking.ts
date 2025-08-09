import type { z } from "zod";

import { HttpError } from "@calcom/lib/http-error";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { BookingStatus } from "@calcom/prisma/enums";
import { bookingCancelInput } from "@calcom/prisma/zod-utils";

import { deleteBooking, type DeleteBookingInput } from "./BookingDeleteService";
import { getBookingToDelete } from "./getBookingToDelete";

const log = logger.getSubLogger({ prefix: ["handleCancelBooking"] });

type PlatformParams = {
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  arePlatformEmailsEnabled?: boolean;
};

export type BookingToDelete = Awaited<ReturnType<typeof getBookingToDelete>>;

export type CancelBookingInput = {
  userId?: number;
  bookingData: z.infer<typeof bookingCancelInput>;
} & PlatformParams;

export type HandleCancelBookingResponse = {
  success: boolean;
  message: string;
  onlyRemovedAttendee: boolean;
  bookingId: number;
  bookingUid: string;
};

async function handler(input: CancelBookingInput) {
  const body = input.bookingData;
  const {
    id,
    uid,
    allRemainingBookings,
    cancellationReason,
    seatReferenceUid,
    cancelledBy,
    cancelSubsequentBookings,
    internalNote,
  } = bookingCancelInput.parse(body);
  const bookingToDelete = await getBookingToDelete(id, uid);
  const {
    userId,
    platformBookingUrl,
    platformCancelUrl,
    platformClientId,
    platformRescheduleUrl,
    arePlatformEmailsEnabled,
  } = input;

  /**
   * Important: We prevent cancelling an already cancelled booking.
   * A booking could have been CANCELLED due to a reschedule,
   * in which case we simply update the existing calendar event and meeting.
   * We want to avoid deleting them by a subsequent cancellation attempt.
   */
  if (bookingToDelete.status === BookingStatus.CANCELLED) {
    throw new HttpError({
      statusCode: 400,
      message: "This booking has already been cancelled.",
    });
  }

  if (!bookingToDelete.userId || !bookingToDelete.user) {
    throw new HttpError({ statusCode: 400, message: "User not found" });
  }

  if (bookingToDelete.eventType?.disableCancelling) {
    throw new HttpError({
      statusCode: 400,
      message: "This event type does not allow cancellations",
    });
  }

  if (!platformClientId && !cancellationReason?.trim() && bookingToDelete.userId == userId) {
    throw new HttpError({
      statusCode: 400,
      message: "Cancellation reason is required when you are the host",
    });
  }

  // If the booking is a seated event and there is no seatReferenceUid we should validate that logged in user is host
  if (bookingToDelete.eventType?.seatsPerTimeSlot && !seatReferenceUid) {
    const userIsHost = bookingToDelete.eventType.hosts.find((host) => {
      if (host.user.id === userId) return true;
    });

    const userIsOwnerOfEventType = bookingToDelete.eventType.owner?.id === userId;

    if (!userIsHost && !userIsOwnerOfEventType) {
      throw new HttpError({ statusCode: 401, message: "User not a host of this event" });
    }
  }

  // Use BookingDeleteService
  const deleteServiceInput: DeleteBookingInput = {
    userId,
    bookingData: {
      id,
      uid,
      allRemainingBookings,
      cancellationReason,
      seatReferenceUid,
      cancelledBy,
      cancelSubsequentBookings,
      internalNote,
    },
    platformClientId,
    platformBookingUrl,
    platformCancelUrl,
    platformRescheduleUrl,
    arePlatformEmailsEnabled,
  };

  try {
    const result = await deleteBooking(deleteServiceInput);

    // Return the result without the audit log for backward compatibility
    return {
      success: result.success,
      message: result.message,
      onlyRemovedAttendee: result.onlyRemovedAttendee,
      bookingId: result.bookingId,
      bookingUid: result.bookingUid,
    };
  } catch (error) {
    log.error("Error in BookingDeleteService", safeStringify({ error }));
    throw error;
  }
}

export default handler;
