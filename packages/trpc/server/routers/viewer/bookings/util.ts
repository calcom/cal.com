import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";
import type {
  Booking,
  EventType,
  BookingReference,
  Attendee,
  Credential,
  DestinationCalendar,
  User,
} from "@calcom/prisma/client";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { commonBookingSchema } from "./types";

export const bookingsProcedure = authedProcedure
  .input(commonBookingSchema)
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    const { bookingId } = input;
    const loggedInUser = ctx.user;

    const bookingRepository = new BookingRepository(prisma);

    const bookingByBeingAdmin = await bookingRepository.findByIdForAdminIncludeFullContext({
      bookingId,
      adminUserId: loggedInUser.id,
    });

    if (bookingByBeingAdmin) {
      return next({ ctx: { booking: bookingByBeingAdmin } });
    }

    const bookingByBeingOrganizerOrCollectiveEventMember =
      await bookingRepository.findByIdForOrganizerOrCollectiveMemberIncludeFullContext({
        bookingId,
        userId: ctx.user.id,
      });

    if (!bookingByBeingOrganizerOrCollectiveEventMember) throw new TRPCError({ code: "UNAUTHORIZED" });

    return next({ ctx: { booking: bookingByBeingOrganizerOrCollectiveEventMember } });
  });

export type BookingsProcedureContext = {
  booking: Booking & {
    eventType:
      | (EventType & {
          team?: { id: number; name: string; parentId?: number | null } | null;
        })
      | null;
    destinationCalendar: DestinationCalendar | null;
    user:
      | (User & {
          destinationCalendar: DestinationCalendar | null;
          credentials: Credential[];
          profiles: { organizationId: number }[];
        })
      | null;
    references: BookingReference[];
    attendees: Attendee[];
  };
};
