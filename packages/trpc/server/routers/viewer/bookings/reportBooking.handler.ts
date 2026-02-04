import { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import logger from "@calcom/lib/logger";
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
  const { bookingUid, reason, description } = input;

  const bookingRepo = new BookingRepository(prisma);
  const bookingReportRepo = new PrismaBookingReportRepository(prisma);
  const bookingAccessService = new BookingAccessService(prisma);

  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingUid,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  const booking = await bookingRepo.findByUidIncludeReport({ bookingUid });

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

  let reportedBookingUids: string[] = [bookingUid];

  if (booking.recurringEventId) {
    const remainingBookings = await bookingRepo.getActiveRecurringBookingsFromDate({
      recurringEventId: booking.recurringEventId,
      fromDate: booking.startTime,
    });
    reportedBookingUids = remainingBookings.map((b: { uid: string }) => b.uid);
  }

  let cancellationError: unknown = null;
  let cancellationAttempted = false;
  let didCancel = false;
  const isUpcoming =
    (booking.status === BookingStatus.ACCEPTED ||
      booking.status === BookingStatus.PENDING ||
      booking.status === BookingStatus.AWAITING_HOST) &&
    new Date(booking.startTime) > new Date();

  if (isUpcoming) {
    cancellationAttempted = true;
    try {
      const normalizedEmail = user.email.trim().toLowerCase();
      const userSeat = booking.seatsReferences.find(
        (seat: { attendee?: { email: string }; referenceUid?: string }) =>
          seat.attendee?.email && seat.attendee.email.trim().toLowerCase() === normalizedEmail
      );
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
  for (const uid of reportedBookingUids) {
    try {
      await bookingReportRepo.createReport({
        bookingUid: uid,
        bookerEmail,
        reportedById: user.id,
        reason,
        description,
        cancelled: didCancel,
        organizationId: user?.organizationId,
      });
      createdCount++;
    } catch (error) {
      log.warn(`Failed to create report for booking ${uid}:`, error);
    }
  }

  const reportedBooking = { uid: reportedBookingUids[0] };

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
    bookingUid: reportedBooking.uid,
    reportedCount: createdCount,
  };
};
