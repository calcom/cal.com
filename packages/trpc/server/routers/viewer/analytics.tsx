import type { Prisma } from "@prisma/client";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { EventsAnalytics } from "@calcom/features/analytics/events";

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
        delete whereConditional.userId;
        whereConditional = {
          ...whereConditional,
          eventType: {
            teamId: teamId,
          },
        };
      } else if (eventTypeId && !!whereConditional) {
        delete whereConditional.userId;
        whereConditional = {
          ...whereConditional,
          eventTypeId: eventTypeId,
        };
      }

      // Migrate to use prisma views
      const baseBookings = await EventsAnalytics.getBaseBookingForEventStatus({
        ...whereConditional,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        eventType: {
          teamId: teamId,
        },
      });
      const startTimeEndTimeDiff = dayjs(endDate).diff(dayjs(startDate), "day");

      const baseBookingIds = baseBookings.map((b) => b.id);

      const totalRescheduled = await EventsAnalytics.getTotalRescheduledEvents(baseBookingIds);

      const totalCancelled = await EventsAnalytics.getTotalCancelledEvents(baseBookingIds);

      const lastPeriodStartDate = dayjs(startDate).subtract(startTimeEndTimeDiff, "day");
      const lastPeriodEndDate = dayjs(endDate).subtract(1, "minute");

      const lastPeriodBaseBookings = await EventsAnalytics.getBaseBookingForEventStatus({
        ...whereConditional,
        createdAt: {
          gte: lastPeriodStartDate.toDate(),
          lte: lastPeriodEndDate.toDate(),
        },
        eventType: {
          teamId: teamId,
        },
      });

      const lastPeriodBaseBookingIds = lastPeriodBaseBookings.map((b) => b.id);

      const lastPeriodTotalRescheduled = await EventsAnalytics.getTotalRescheduledEvents(
        lastPeriodBaseBookingIds
      );

      const lastPeriodTotalCancelled = await EventsAnalytics.getTotalCancelledEvents(
        lastPeriodBaseBookingIds
      );

      return {
        created: {
          count: baseBookings.length,
          deltaPrevious: baseBookings.length - lastPeriodBaseBookings.length,
        },
        completed: {
          count: baseBookings.length - totalCancelled - totalRescheduled,
          deltaPrevious:
            baseBookings.length -
            totalCancelled -
            totalRescheduled -
            lastPeriodBaseBookings.length -
            lastPeriodTotalCancelled -
            lastPeriodTotalRescheduled,
        },
        rescheduled: {
          count: totalRescheduled,
          deltaPrevious: totalRescheduled - lastPeriodTotalRescheduled,
        },
        cancelled: {
          count: totalCancelled,
          deltaPrevious: totalCancelled - lastPeriodTotalCancelled,
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
        userId: z.coerce.number().optional(),
        timeView: z.enum(["week", "month", "year"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        teamId,
        startDate: startDateString,
        endDate: endDateString,
        eventTypeId,
        userId,
        timeView: inputTimeView,
      } = input;
      const startDate = dayjs(startDateString);
      const endDate = dayjs(endDateString);
      const user = ctx.user;
      const timeView = inputTimeView;
      // Just for type safety but authedProcedure should have already checked this

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      let whereConditional: Prisma.BookingWhereInput = {
        eventType: {
          teamId: teamId,
        },
      };

      if (userId) {
        delete whereConditional.eventType;
        whereConditional = {
          ...whereConditional,
          userId,
        };
      }
      if (eventTypeId && !!whereConditional) {
        delete whereConditional.eventType;
        delete whereConditional.userId;
        whereConditional = {
          ...whereConditional,
          eventTypeId: eventTypeId,
        };
      }

      // Get timeline data
      const timeline = await EventsAnalytics.getTimeLine(timeView, dayjs(startDate), dayjs(endDate));

      // iterate timeline and fetch data
      if (!timeline) {
        return [];
      }

      const dateFormat: string = timeView === "year" ? "YYYY" : timeView === "month" ? "MMM YYYY" : "ll";
      const result = [];

      for (const date of timeline) {
        const EventData = {
          Month: dayjs(date).format(dateFormat),
          Created: 0,
          Completed: 0,
          Rescheduled: 0,
          Cancelled: 0,
        };
        const startOfEndOf = timeView === "year" ? "year" : timeView === "month" ? "month" : "week";

        const startDate = dayjs(date).startOf(startOfEndOf);
        const endDate = dayjs(date).endOf(startOfEndOf);

        const promisesResult = await Promise.all([
          EventsAnalytics.getCreatedEventsInTimeRange(
            {
              start: startDate,
              end: endDate,
            },
            whereConditional
          ),
          EventsAnalytics.getCompletedEventsInTimeRange(
            {
              start: startDate,
              end: endDate,
            },
            whereConditional
          ),
          EventsAnalytics.getRescheduledEventsInTimeRange(
            {
              start: startDate,
              end: endDate,
            },
            whereConditional
          ),
          EventsAnalytics.getCancelledEventsInTimeRange(
            {
              start: startDate,
              end: endDate,
            },
            whereConditional
          ),
        ]);
        EventData["Created"] = promisesResult[0];
        EventData["Completed"] = promisesResult[1];
        EventData["Rescheduled"] = promisesResult[2];
        EventData["Cancelled"] = promisesResult[3];
        result.push(EventData);
      }

      return result;
    }),
  popularEventTypes: userBelongsToTeamProcedure
    .input(
      z.object({
        userId: z.coerce.number().optional(),
        teamId: z.coerce.number().optional(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate } = input;
      const user = ctx.user;

      // Just for type safety but authedProcedure should have already checked this
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      const bookingsFromTeam = await ctx.prisma.booking.groupBy({
        by: ["eventTypeId"],
        where: {
          eventType: {
            teamId: teamId,
          },
          createdAt: {
            gte: dayjs(startDate).startOf("day").toDate(),
            lte: dayjs(endDate).endOf("day").toDate(),
          },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: "desc",
          },
        },
        take: 10,
      });
      const eventTypeIds = bookingsFromTeam
        .filter((booking) => typeof booking.eventTypeId === "number")
        .map((booking) => booking.eventTypeId);
      const eventTypesFromTeam = await ctx.prisma.eventType.findMany({
        where: {
          teamId: teamId,
          id: {
            in: eventTypeIds as number[],
          },
        },
      });

      const eventTypeHashMap = new Map();
      eventTypesFromTeam.forEach((eventType) => {
        eventTypeHashMap.set(eventType.id, eventType.title);
      });

      const result = bookingsFromTeam.map((booking) => {
        return {
          eventTypeId: booking.eventTypeId,
          eventTypeName: eventTypeHashMap.get(booking.eventTypeId),
          count: booking._count.id,
        };
      });
      return result;
    }),
  averageEventDuration: userBelongsToTeamProcedure
    .input(
      z.object({
        userId: z.coerce.number().optional(),
        teamId: z.coerce.number().optional(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate: startDateString, endDate: endDateString, userId } = input;
      const user = ctx.user;
      const startDate = dayjs(startDateString);
      const endDate = dayjs(endDateString);

      // Just for type safety but authedProcedure should have already checked this
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      const whereConditional: Prisma.BookingWhereInput = {
        eventType: {
          teamId: teamId,
        },
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };

      if (userId) {
        delete whereConditional.eventType;
        whereConditional["userId"] = userId;
      }

      // It has to use timeline
      const timeView = await EventsAnalytics.getTimeLine("week", startDate, endDate);
    }),
});
