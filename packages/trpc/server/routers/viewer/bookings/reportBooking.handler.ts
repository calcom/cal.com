import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { isTeamAdmin, isTeamOwner } from "@calcom/lib/server/queries/teams";
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

export const reportBookingHandler = async ({ ctx, input }: ReportBookingOptions) => {
  const { user } = ctx;
  const { bookingId, reason, description, cancelBooking } = input;

  const booking = await prisma.booking.findUnique({
    where: {
      id: bookingId,
    },
    include: {
      attendees: true,
      eventType: {
        include: {
          team: {
            select: {
              id: true,
              name: true,
              parentId: true,
            },
          },
        },
      },
      reports: {
        where: {
          reportedById: user.id,
        },
      },
    },
  });

  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  const isBookingOwner = booking.userId === user.id;
  const isAttendee = booking.attendees.some((attendee) => attendee.email === user.email);
  const isTeamAdminOrOwner =
    booking.eventType?.teamId &&
    ((await isTeamAdmin(user.id, booking.eventType.teamId)) ||
      (await isTeamOwner(user.id, booking.eventType.teamId)));

  if (!isBookingOwner && !isAttendee && !isTeamAdminOrOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  // Check if user has already reported this booking or any in the recurring series
  const existingReports = booking.reports;

  if (booking.recurringEventId) {
    // For recurring bookings, check if user has reported any booking in the series
    const recurringReports = await prisma.bookingReport.findMany({
      where: {
        reportedById: user.id,
        booking: {
          recurringEventId: booking.recurringEventId,
        },
      },
    });

    if (recurringReports.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You have already reported this recurring booking series",
      });
    }
  } else if (existingReports.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You have already reported this booking" });
  }

  // For recurring bookings, report all remaining instances
  let reportedBookingIds: number[] = [bookingId];

  if (booking.recurringEventId) {
    // Get all future bookings in the recurring series
    const futureRecurringBookings = await prisma.booking.findMany({
      where: {
        recurringEventId: booking.recurringEventId,
        startTime: {
          gte: new Date(),
        },
      },
      select: {
        id: true,
      },
    });

    reportedBookingIds = futureRecurringBookings.map((b) => b.id);
  }

  // Create reports for all relevant bookings
  const bookingReports = await prisma.bookingReport.createMany({
    data: reportedBookingIds.map((id) => ({
      bookingId: id,
      reportedById: user.id,
      reason,
      description,
      cancelled: cancelBooking,
    })),
  });

  const bookingReport = { id: reportedBookingIds[0] }; // For backward compatibility

  // Cancel booking if requested and conditions are met
  let cancellationError = null;
  if (
    cancelBooking &&
    booking.status === BookingStatus.ACCEPTED &&
    new Date(booking.startTime) > new Date()
  ) {
    try {
      await handleCancelBooking({
        bookingData: {
          uid: booking.uid,
          cancellationReason: `Booking reported: ${reason}${description ? ` - ${description}` : ""}`,
          cancelledBy: user.email,
        },
        userId: user.id,
      });
    } catch (error) {
      cancellationError = error;
      // Use proper logging framework if available
      console.error("Failed to cancel booking after reporting:", error);
    }
  }

  const isRecurring = booking.recurringEventId && reportedBookingIds.length > 1;
  const baseMessage = isRecurring
    ? `${reportedBookingIds.length} recurring bookings reported`
    : "Booking reported";

  return {
    success: true,
    message: cancellationError
      ? `${baseMessage} successfully but cancellation failed`
      : cancelBooking
      ? `${baseMessage} and cancelled successfully`
      : `${baseMessage} successfully`,
    reportId: bookingReport.id,
    reportedCount: reportedBookingIds.length,
    cancellationError: cancellationError ? String(cancellationError) : undefined,
  };
};
