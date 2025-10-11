import { PrismaBookingReportRepository } from "@calcom/lib/server/repository/bookingReport";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import logger from "@calcom/lib/logger";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { BookingAccessService } from "@calcom/lib/server/service/bookingAccessService";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";

import { TRPCError } from "@trpc/server";

import type { TReportBookingInputSchema } from "./reportBooking.schema";

type ReportBookingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TReportBookingInputSchema;
};

const log = logger.getSubLogger({ prefix: ["reportBookingHandler"] });

export const reportBookingHandler = async ({ ctx, input }: ReportBookingOptions) => {
  const { user } = ctx;
  const { bookingId, reason, description } = input;

  const bookingRepo = new BookingRepository(prisma);
  const bookingReportRepo = new PrismaBookingReportRepository(prisma);
  const bookingAccessService = new BookingAccessService(prisma);

  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingId,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  const booking = await bookingRepo.getBookingForReporting({ bookingId });

  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  if (booking.report) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This booking has already been reported" });
  }

  const bookerEmail = booking.attendees[0]?.email;
  if (!bookerEmail) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Booking has no attendees" });
  }

  let reportedBookingIds: number[] = [bookingId];

  if (booking.recurringEventId) {
    const remainingBookings = await bookingRepo.getActiveRecurringBookingsFromDate({
      recurringEventId: booking.recurringEventId,
      fromDate: booking.startTime,
    });
    reportedBookingIds = remainingBookings.map((b) => b.id);
  }

  let cancellationError: unknown = null;
  let cancellationAttempted = false;
  let didCancel = false;
  const isUpcoming =
    (booking.status === BookingStatus.ACCEPTED || booking.status === BookingStatus.PENDING) &&
    new Date(booking.startTime) > new Date();

  if (isUpcoming) {
    cancellationAttempted = true;
    try {
      const userSeat = booking.seatsReferences.find((seat) => seat.attendee?.email === user.email);
      const seatReferenceUid = userSeat?.referenceUid;

      await handleCancelBooking({
        bookingData: {
          uid: booking.uid,
          cancelledBy: user.email,
          skipCancellationReasonValidation: true,
          ...(booking.recurringEventId ? { cancelSubsequentBookings: true } : {}),
          ...(seatReferenceUid ? { seatReferenceUid } : {}),
        },
        userId: user.id,
      });
      didCancel = true;
    } catch (error) {
      cancellationError = error;
      log.error("Failed to cancel booking after reporting:", error);
    }
  }

  let createdCount = 0;
  for (const id of reportedBookingIds) {
    try {
      await bookingReportRepo.createReport({
        bookingId: id,
        bookerEmail,
        reportedById: user.id,
        reason,
        description,
        cancelled: didCancel,
      });
      createdCount++;
    } catch (error) {
      log.warn(`Failed to create report for booking ${id}:`, error);
    }
  }

  const reportedBooking = { id: reportedBookingIds[0] };

  const isRecurring = Boolean(booking.recurringEventId) && createdCount > 1;
  const baseMessage = isRecurring ? `${createdCount} recurring bookings reported` : "Booking reported";
  const success = createdCount > 0;

  return {
    success,
    message: success
      ? cancellationAttempted
        ? cancellationError
          ? `${baseMessage} successfully, but cancellation failed`
          : `${baseMessage} and cancelled successfully`
        : `${baseMessage} successfully`
      : "No reports created",
    bookingId: reportedBooking.id,
    reportedCount: createdCount,
  };
};
