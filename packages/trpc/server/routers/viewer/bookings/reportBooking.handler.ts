import type { ValidActionSource } from "@calcom/features/booking-audit/lib/types/actionSource";
import { PrismaBookingReportRepository } from "@calcom/features/bookingReport/repositories/PrismaBookingReportRepository";
import handleCancelBooking from "@calcom/features/bookings/lib/handleCancelBooking";
import { isUpcomingBooking } from "@calcom/features/bookings/lib/isUpcomingBooking";
import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { extractDomainFromEmail } from "@calcom/features/watchlist/lib/utils/normalization";
import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TReportBookingInputSchema } from "./reportBooking.schema";

type ReportBookingOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TReportBookingInputSchema;
  actionSource: ValidActionSource;
};

const log = logger.getSubLogger({ prefix: ["reportBookingHandler"] });

export const reportBookingHandler = async ({ ctx, input, actionSource }: ReportBookingOptions) => {
  const { user } = ctx;
  const { bookingUid, reason, description, reportType = "EMAIL" } = input;

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

  // Use the booking's actual host for email/domain queries (the reporting user
  // may have access through team/org admin but not be the direct host)
  const hostUserId = booking.userId ?? user.id;

  if (reportType === "DOMAIN") {
    if (booking.seatsReferences.length > 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Domain reporting is not available for seated events",
      });
    }

    const isFreeDomain = await checkIfFreeEmailDomain({ email: bookerEmail });
    if (isFreeDomain) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot report by domain for free email providers",
      });
    }
  }

  // Find additional upcoming bookings to cancel based on report type
  let additionalBookings: { uid: string; report: { id: string } | null; attendees: { email: string }[] }[];

  if (reportType === "DOMAIN") {
    const domain = extractDomainFromEmail(bookerEmail);
    additionalBookings = await bookingRepo.findUpcomingByAttendeeDomain({
      domain,
      hostUserId,
    });
  } else {
    additionalBookings = await bookingRepo.findUpcomingByAttendeeEmail({
      attendeeEmail: bookerEmail,
      hostUserId,
    });
  }

  // Build the full list of bookings to cancel: the original booking + any additional matches
  // Filter out already-reported bookings and the original (handled separately)
  const additionalUids = additionalBookings
    .filter((b) => !b.report && b.uid !== bookingUid)
    .map((b) => b.uid);

  const allBookingsToCancelUids: string[] = [];

  // Always cancel the original booking if it's upcoming
  if (isUpcomingBooking(booking)) {
    allBookingsToCancelUids.push(bookingUid);
  }

  // Add additional email/domain matches
  allBookingsToCancelUids.push(...additionalUids);

  // For seated events, find the reporter's seat so we remove only their seat
  // instead of cancelling the entire booking
  let seatReferenceUid: string | undefined;
  if (booking.seatsReferences.length > 0) {
    const normalizedEmail = user.email.trim().toLowerCase();
    const userSeat = booking.seatsReferences.find(
      (seat: { attendee?: { email: string }; referenceUid?: string }) =>
        seat.attendee?.email && seat.attendee.email.trim().toLowerCase() === normalizedEmail
    );
    seatReferenceUid = userSeat?.referenceUid;
  }

  // Cancel all upcoming bookings in parallel (no emails or workflow triggers)
  const cancellationResults = await Promise.allSettled(
    allBookingsToCancelUids.map((uid) =>
      handleCancelBooking({
        bookingData: {
          uid,
          cancelledBy: user.email,
          skipCancellationReasonValidation: true,
          ...(uid === bookingUid && seatReferenceUid ? { seatReferenceUid } : {}),
        },
        userId: user.id,
        actionSource,
        skipNotifications: true,
      })
    )
  );

  const cancelledUids = new Set<string>();
  cancellationResults.forEach((result, index) => {
    if (result.status === "fulfilled") {
      cancelledUids.add(allBookingsToCancelUids[index]);
    } else {
      log.error("Failed to cancel booking during spam report:", result.reason);
    }
  });

  // Create reports for the original booking plus all additional bookings
  // For domain reports, use the domain as bookerEmail so they group together in the admin blocklist
  const reportEmail = reportType === "DOMAIN" ? `@${extractDomainFromEmail(bookerEmail)}` : bookerEmail;

  const reportUids = Array.from(new Set([bookingUid, ...additionalUids]));
  let createdCount = 0;

  for (const uid of reportUids) {
    try {
      await bookingReportRepo.createReport({
        bookingUid: uid,
        bookerEmail: reportEmail,
        reportedById: user.id,
        reason,
        description,
        cancelled: cancelledUids.has(uid),
        organizationId: user?.organizationId,
      });
      createdCount++;
    } catch (error) {
      log.warn(`Failed to create report for booking ${uid}:`, error);
    }
  }

  const success = createdCount > 0;
  const baseMessage = createdCount > 1 ? `${createdCount} bookings reported` : "Booking reported";

  let message = "No reports created";
  if (success && cancelledUids.size > 0) {
    message = `${baseMessage} and cancelled successfully`;
  } else if (success) {
    message = `${baseMessage} successfully`;
  }

  return {
    success,
    message,
    bookingUid,
    reportedCount: createdCount,
  };
};
