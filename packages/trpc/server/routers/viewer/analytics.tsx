import type { Prisma } from "@prisma/client";
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
        created: {
          count: baseBookings.length,
          deltaPrevious: 0,
        },
        completed: {
          count: baseBookings.length - totalRescheduled - totalCancelled,
          deltaPrevious: 1,
        },
        rescheduled: {
          count: totalRescheduled,
          deltaPrevious: 2,
        },
        cancelled: {
          count: totalCancelled,
          deltaPrevious: 3,
        },
      };
    }),
  eventsTimeline: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().optional(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        timeView: z.enum(["week", "month", "year"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, timeView } = input;
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

      const bookings = await ctx.prisma.booking.findMany({
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

      // Get timeline data
      if (timeView) {
        // switch (timeView) {
        //   case "week":
        //     return getWeekTimeline(booking);
        //   case "month":
        //     return getMonthTimeline(booking);
        //   case "year":
        //     return getYearTimeline(booking);
        //   default:
        //     return getWeekTimeline(booking);
        // }
        console.log({ bookings });
      }

      return [
        {
          Month: "Dec 15",
          Created: 2890,
          Completed: 2390,
          Rescheduled: 500,
          Cancelled: 100,
        },
        {
          Month: "Dec 22",
          Created: 1890,
          Completed: 1590,
          Rescheduled: 300,
          Cancelled: 120,
        },
        {
          Month: "Dec 29",
          Created: 4890,
          Completed: 4290,
          Rescheduled: 800,
          Cancelled: 300,
        },
        {
          Month: "Jan 06",
          Created: 3890,
          Completed: 2400,
          Rescheduled: 500,
          Cancelled: 200,
        },
        {
          Month: "Jan 13",
          Created: 1890,
          Completed: 1590,
          Rescheduled: 200,
          Cancelled: 50,
        },
      ];
    }),
});
function getWeekTimeline() {
  throw new Error("Function not implemented.");
}

function getMonthTimeline() {
  throw new Error("Function not implemented.");
}

function getYearTimeline() {
  throw new Error("Function not implemented.");
}
