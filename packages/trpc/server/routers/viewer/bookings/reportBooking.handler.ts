import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { BookingReportRepository } from "@calcom/features/bookings/lib/booking-report.repository";
import { extractBookerEmail } from "@calcom/features/bookings/lib/booking-report.utils";
import { BookingRepository } from "@calcom/lib/server/repository/booking";
import { prisma } from "@calcom/prisma";
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

export const reportBookingHandler = async ({ ctx, input }: ReportBookingOptions) => {
  const { user } = ctx;
  const { bookingId, reason, description, cancelBooking, allRemainingBookings } = input;

  const bookingRepo = new BookingRepository(prisma);
  const bookingReportRepo = new BookingReportRepository(prisma);

  const hasAccess = await bookingRepo.doesUserIdHaveAccessToBooking({
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

  // Check cancellation status - allow reporting cancelled bookings ONLY if others already reported
  if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.REJECTED) {
    if (booking.reports.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot report cancelled or rejected bookings",
      });
    }
  }

  const userReport = booking.reports.find((r) => r.reportedById === user.id);
  if (userReport) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You have already reported this booking" });
  }

  if (booking.recurringEventId && allRemainingBookings) {
    // For recurring bookings, check if THIS USER has reported any booking in the series
    const hasReportedSeries = await bookingReportRepo.hasUserReportedSeries(
      booking.recurringEventId,
      user.id
    );

    if (hasReportedSeries) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have already reported this recurring booking series",
      });
    }
  }

  // Get the booker email (first attendee)
  const bookerEmail = extractBookerEmail(booking.attendees);
  if (!bookerEmail) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Booking has no attendees" });
  }

  // Determine which bookings to report
  let reportedBookingIds: number[] = [bookingId];

  if (booking.recurringEventId && allRemainingBookings) {
    // Get all remaining bookings in the series from the selected occurrence onward
    const remainingRecurringBookings = await prisma.booking.findMany({
      where: {
        recurringEventId: booking.recurringEventId,
        startTime: { gte: booking.startTime },
      },
      select: { id: true },
      orderBy: { startTime: "asc" },
    });
    reportedBookingIds = remainingRecurringBookings.map((b) => b.id);
  }

  // Create reports for all relevant bookings
  let createdCount = 0;
  for (const id of reportedBookingIds) {
    try {
      await bookingReportRepo.createReport({
        bookingId: id,
        bookerEmail: bookerEmail,
        reportedById: user.id,
        reason,
        description,
        cancelled: cancelBooking,
      });
      createdCount++;
    } catch (error) {
      console.warn(`Failed to create report for booking ${id}:`, error);
    }
  }

  const reportedBooking = { id: reportedBookingIds[0] };

  // Cancel booking if requested and conditions are met
  let cancellationError = null;
  if (
    cancelBooking &&
    (booking.status === BookingStatus.ACCEPTED || booking.status === BookingStatus.PENDING) &&
    new Date(booking.startTime) > new Date()
  ) {
    try {
      await handleCancelBooking({
        bookingData: {
          uid: booking.uid,
          cancelledBy: user.email,
          allRemainingBookings: booking.recurringEventId && allRemainingBookings ? true : undefined,
        },
        userId: user.id,
      });
    } catch (error) {
      cancellationError = error;
      console.error("Failed to cancel booking after reporting:", error);
    }
  }

  const isRecurring = Boolean(booking.recurringEventId) && createdCount > 1;
  const baseMessage = isRecurring ? `${createdCount} recurring bookings reported` : "Booking reported";

  return {
    success: true,
    message: cancellationError
      ? `${baseMessage} successfully, but cancellation failed`
      : cancelBooking
      ? `${baseMessage} and cancelled successfully`
      : `${baseMessage} successfully`,
    bookingId: reportedBooking.id,
    reportedCount: createdCount,
    cancellationError: cancellationError ? String(cancellationError) : undefined,
  };
};
