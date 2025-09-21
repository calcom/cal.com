import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { isTeamAdmin, isTeamOwner, getTeamDataForAdmin } from "@calcom/lib/server/queries/membership";
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
    select: {
      id: true,
      userId: true,
      uid: true,
      startTime: true,
      status: true,
      recurringEventId: true,
      attendees: {
        select: {
          email: true,
        },
      },
      eventType: {
        select: {
          teamId: true,
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
        select: {
          id: true,
        },
      },
    },
  });

  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  const isBookingOwner = booking.userId === user.id;
  const isAttendee = booking.attendees.some((attendee) => attendee.email === user.email);

  // Check if user is team admin/owner for the event type's team
  let isTeamAdminOrOwner = false;
  if (booking.eventType?.teamId) {
    isTeamAdminOrOwner =
      !!(await isTeamAdmin(user.id, booking.eventType.teamId)) ||
      (await isTeamOwner(user.id, booking.eventType.teamId));
  }

  // Check if user can access this booking through team membership
  // This reuses the same logic as get.handler.ts
  let canAccessThroughTeamMembership = false;

  // Get all memberships where user is ADMIN/OWNER (reusing shared utility)
  const { userEmails: teamMemberEmailList } = await getTeamDataForAdmin(
    user.id,
    user?.profile?.organizationId
  );

  if (teamMemberEmailList.length > 0) {
    // Check if any booking attendees are team members where user is admin/owner
    const hasTeamMemberAttendee = booking.attendees.some((attendee) =>
      teamMemberEmailList.includes(attendee.email)
    );

    // Check if booking owner is a team member where user is admin/owner
    let isBookingOwnerTeamMember = false;
    if (booking.userId) {
      const bookingOwner = await prisma.user.findUnique({
        where: { id: booking.userId },
        select: { email: true },
      });
      isBookingOwnerTeamMember = !!(bookingOwner && teamMemberEmailList.includes(bookingOwner.email));
    }

    canAccessThroughTeamMembership = hasTeamMemberAttendee || isBookingOwnerTeamMember;
  }

  if (!isBookingOwner && !isAttendee && !isTeamAdminOrOwner && !canAccessThroughTeamMembership) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  // Check if booking has already been reported
  if (booking.reports && booking.reports.length > 0) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This booking has already been reported" });
  }

  if (booking.recurringEventId) {
    // For recurring bookings, check if any booking in the series has been reported
    const existingRecurringReport = await prisma.bookingReport.findFirst({
      where: {
        booking: {
          recurringEventId: booking.recurringEventId,
        },
      },
    });

    if (existingRecurringReport) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This recurring booking series has already been reported",
      });
    }
  }

  // For recurring bookings, report all remaining instances
  let reportedBookingIds: number[] = [bookingId];

  if (booking.recurringEventId) {
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

  // Create reports for all relevant bookings (tolerate duplicates under concurrency)
  const createResult = await prisma.bookingReport.createMany({
    data: reportedBookingIds.map((id) => ({
      bookingId: id,
      reportedById: user.id,
      reason,
      description,
      cancelled: cancelBooking,
    })),
    skipDuplicates: true,
  });

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
          fromReport: true, // Bypass cancellation reason requirement for report cancellations
          allRemainingBookings: booking.recurringEventId ? true : undefined,
        },
        userId: user.id,
      });
    } catch (error) {
      cancellationError = error;
      console.error("Failed to cancel booking after reporting:", error);
    }
  }

  const createdCount = createResult.count;
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
