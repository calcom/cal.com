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

  if (booking.reports.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "You have already reported this booking" });
  }

  const bookingReport = await prisma.bookingReport.create({
    data: {
      bookingId,
      reportedById: user.id,
      reason,
      description,
      cancelled: cancelBooking,
    },
  });

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

  return {
    success: true,
    message: cancellationError
      ? "Booking reported successfully but cancellation failed"
      : cancelBooking
      ? "Booking reported and cancelled successfully"
      : "Booking reported successfully",
    reportId: bookingReport.id,
    cancellationError: cancellationError ? String(cancellationError) : undefined,
  };
};
