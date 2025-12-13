import { getBookingRepository } from "@calcom/features/di/containers/Booking";
import type { BookingFullContextDto } from "@calcom/features/bookings/repositories/IBookingRepository";

import { TRPCError } from "@trpc/server";

import authedProcedure from "../../../procedures/authedProcedure";
import { commonBookingSchema } from "./types";

export const bookingsProcedure = authedProcedure
  .input(commonBookingSchema)
  .use(async ({ ctx, input, next }) => {
    // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
    const { bookingId } = input;
    const loggedInUser = ctx.user;

    const bookingRepository = getBookingRepository();

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
  booking: BookingFullContextDto;
};
