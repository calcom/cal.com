import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { BookingAccessService } from "@calcom/features/bookings/services/BookingAccessService";
import { checkIfFreeEmailDomain } from "@calcom/features/watchlist/lib/freeEmailDomainCheck/checkIfFreeEmailDomain";
import { extractDomainFromEmail } from "@calcom/features/watchlist/lib/utils/normalization";
import prisma from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/types";
import { TRPCError } from "@trpc/server";
import type { TGetUpcomingBookingsByDomainInputSchema } from "./getUpcomingBookingsByDomain.schema";

type Options = {
  ctx: { user: NonNullable<TrpcSessionUser> };
  input: TGetUpcomingBookingsByDomainInputSchema;
};

export const getUpcomingBookingsByDomainHandler = async ({ ctx, input }: Options) => {
  const { user } = ctx;
  const { bookingUid, reportType = "DOMAIN" } = input;

  const bookingAccessService = new BookingAccessService(prisma);
  const hasAccess = await bookingAccessService.doesUserIdHaveAccessToBooking({
    userId: user.id,
    bookingUid,
  });

  if (!hasAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "You don't have access to this booking" });
  }

  const bookingRepo = new BookingRepository(prisma);
  const booking = await bookingRepo.findByUidIncludeReport({ bookingUid });

  if (!booking) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Booking not found" });
  }

  const bookerEmail = booking.attendees[0]?.email;
  if (!bookerEmail) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Booking has no attendees" });
  }

  const domain = extractDomainFromEmail(bookerEmail);

  const isFreeDomain = await checkIfFreeEmailDomain({ email: bookerEmail });
  if (isFreeDomain) {
    return { domain, isFreeDomain: true, bookerEmail, bookings: [] };
  }

  const hostUserId = booking.userId ?? user.id;

  let upcomingBookings;
  if (reportType === "EMAIL") {
    upcomingBookings = await bookingRepo.findUpcomingByAttendeeEmail({
      attendeeEmail: bookerEmail,
      hostUserId,
    });
  } else {
    upcomingBookings = await bookingRepo.findUpcomingByAttendeeDomain({ domain, hostUserId });
  }

  return {
    domain,
    isFreeDomain: false,
    bookerEmail,
    bookings: upcomingBookings
      .filter((b) => !b.report)
      .map((b) => ({
        uid: b.uid,
        title: b.title,
        startTime: b.startTime,
        endTime: b.endTime,
        attendeeEmail: b.attendees[0]?.email ?? "",
      })),
  };
};
