import { Prisma } from "@prisma/client";
import { z } from "zod";

import { TRPCError } from "@trpc/server";

import { router, userBelongsToTeamProcedure } from "../../trpc";

export const analyticsRouter = router({
  eventsByStatus: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().optional(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId } = input;
      const user = ctx.user;

      // Just for type safety but authedProcedure should have already checked this
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      let whereConditional: Prisma.BookingWhereInput = {
        userId: user.id,
      };
      if (teamId && !!whereConditional) {
        whereConditional = {
          ...whereConditional,
          eventType: {
            teamId: teamId,
          },
        };
      } else if (eventTypeId && !!whereConditional) {
        whereConditional = {
          ...whereConditional,
          eventTypeId: eventTypeId,
        };
      }

      // Migrate to use prisma views
      const baseBookings = await ctx.prisma.booking.findMany({
        where: {
          ...whereConditional,
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
          eventType: {
            teamId: teamId,
          },
        },
        select: {
          id: true,
          eventType: true,
        },
      });
      const baseBookingIds = baseBookings.map((b) => b.id);

      const totalRescheduled = await ctx.prisma.booking.count({
        where: {
          id: {
            in: baseBookingIds,
          },
          rescheduled: true,
        },
      });

      const totalCancelled = await ctx.prisma.booking.count({
        where: {
          id: {
            in: baseBookingIds,
          },
          status: "CANCELLED",
        },
      });

      const totalIncomplete = await ctx.prisma.booking.count({
        where: {
          id: {
            in: baseBookingIds,
          },
          status: "ACCEPTED",
          endTime: {
            lte: new Date(endDate),
          },
        },
      });

      return {
        rescheduled: {
          count: totalRescheduled,
          deltaPrevious: 1,
        },
        cancelled: {
          count: totalCancelled,
          deltaPrevious: 2,
        },
        completed: {
          count: baseBookings.length - totalRescheduled - totalCancelled,
          deltaPrevious: 3,
        },
        created: {
          count: baseBookings.length,
          deltaPrevious: 4,
        },
      };
    }),
});
