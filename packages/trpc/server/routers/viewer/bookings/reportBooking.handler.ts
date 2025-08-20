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
        where: {
          reportedById: user.id,
        },
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

  // For team admins, also check if they can see this booking through team membership
  // This matches the logic in get.handler.ts where team admins can see bookings from their team members
  let canAccessThroughTeamMembership = false;

  // Get all memberships where user is ADMIN/OWNER (same logic as get.handler.ts)
  const membershipIdsWhereUserIsAdminOwner = (
    await prisma.membership.findMany({
      where: {
        userId: user.id,
        role: {
          in: ["ADMIN", "OWNER"],
        },
      },
      select: {
        id: true,
      },
    })
  ).map((membership) => membership.id);

  if (membershipIdsWhereUserIsAdminOwner.length > 0) {
    // Get all team member emails where user is admin/owner
    const teamMemberEmails = await prisma.user.findMany({
      where: {
        teams: {
          some: {
            team: {
              members: {
                some: {
                  id: { in: membershipIdsWhereUserIsAdminOwner },
                },
              },
            },
          },
        },
      },
      select: {
        email: true,
      },
    });

    const teamMemberEmailList = teamMemberEmails.map((user) => user.email);

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

    canAccessThroughTeamMembership = hasTeamMemberAttendee || isBookingOwnerTeamMember || isTeamAdminOrOwner;
  }

  if (!isBookingOwner && !isAttendee && !canAccessThroughTeamMembership) {
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
      },
      select: {
        id: true,
      },
    });

    reportedBookingIds = futureRecurringBookings.map((b) => b.id);
  }

  // Create reports for all relevant bookings
  await prisma.bookingReport.createMany({
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
