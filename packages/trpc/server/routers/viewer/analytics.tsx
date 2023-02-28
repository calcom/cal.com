import type { Prisma } from "@prisma/client";
import { z } from "zod";

import type { Dayjs } from "@calcom/dayjs";
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
            lastPeriodBaseBookings.length +
            lastPeriodTotalCancelled +
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
        timeView: z.enum(["week", "month", "year"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, timeView: inputTimeView } = input;
      const user = ctx.user;
      let timeView = inputTimeView;
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

      if (dayjs(startDate).diff(dayjs(endDate), "day") > 90) {
        timeView = "month";
      } else if (dayjs(startDate).diff(dayjs(endDate), "day") > 365) {
        timeView = "year";
      }

      // Get timeline data
      let timeline;
      if (timeView) {
        switch (timeView) {
          case "week":
            timeline = getWeekTimeline(dayjs(startDate), dayjs(endDate));
            break;
          case "month":
            timeline = getMonthTimeline(dayjs(startDate), dayjs(endDate));
            break;
          case "year":
            timeline = getYearTimeline(dayjs(startDate), dayjs(endDate));
            break;
          default:
            timeline = getWeekTimeline(dayjs(startDate), dayjs(endDate));
            break;
        }
      }

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
});

function getWeekTimeline(startDate: Dayjs, endDate: Dayjs) {
  let pivotDate = dayjs(startDate);
  const dates = [];
  while (pivotDate.isBefore(endDate)) {
    pivotDate = pivotDate.add(7, "day");
    dates.push(pivotDate.format("YYYY-MM-DD"));
  }
  return dates;
}

function getMonthTimeline(startDate: Dayjs, endDate: Dayjs) {
  let pivotDate = dayjs(startDate);
  const dates = [];
  while (pivotDate.isBefore(endDate)) {
    pivotDate = pivotDate.set("month", pivotDate.get("month") + 1);

    dates.push(pivotDate.format("YYYY-MM-DD"));
  }
  return dates;
}

function getYearTimeline(startDate: Dayjs, endDate: Dayjs) {
  const pivotDate = dayjs(startDate);
  const dates = [];
  while (pivotDate.isBefore(endDate)) {
    pivotDate.set("year", pivotDate.get("year") + 1);
    dates.push(pivotDate.format("YYYY-MM-DD"));
  }
  return dates;
}
