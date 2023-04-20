import { SchedulingType } from "@prisma/client";
import z from "zod";

import { TRPCError } from "@trpc/server";

import authedProcedure from "./authedProcedure";

// Common data for all endpoints under webhook
export const commonBookingSchema = z.object({
  bookingId: z.number(),
});

const bookingsProcedure = authedProcedure.input(commonBookingSchema).use(async ({ ctx, input, next }) => {
  // Endpoints that just read the logged in user's data - like 'list' don't necessary have any input
  const { bookingId } = input;
  const booking = await ctx.prisma.booking.findFirst({
    where: {
      id: bookingId,
      AND: [
        {
          OR: [
            /* If user is organizer */
            { userId: ctx.user.id },
            /* Or part of a collective booking */
            {
              eventType: {
                schedulingType: SchedulingType.COLLECTIVE,
                users: {
                  some: {
                    id: ctx.user.id,
                  },
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      attendees: true,
      eventType: true,
      destinationCalendar: true,
      references: true,
      user: {
        include: {
          destinationCalendar: true,
          credentials: true,
        },
      },
    },
  });

  if (!booking) throw new TRPCError({ code: "UNAUTHORIZED" });

  return next({ ctx: { booking } });
});

export default bookingsProcedure;
