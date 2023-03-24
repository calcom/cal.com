import type { Prisma } from "@prisma/client";
import crypto from "crypto";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { authedProcedure, isAuthed, router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { EventsInsights } from "./events";

const UserBelongsToTeamInput = z.object({
  teamId: z.coerce.number().optional(),
});

const userBelongsToTeamMiddleware = isAuthed.unstable_pipe(async ({ ctx, next, rawInput }) => {
  const parse = UserBelongsToTeamInput.safeParse(rawInput);
  if (!parse.success) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  const team = await ctx.prisma.membership.findFirst({
    where: {
      userId: ctx.user.id,
      teamId: parse.data.teamId,
    },
  });

  if (!team) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next();
});

const userBelongsToTeamProcedure = authedProcedure.use(userBelongsToTeamMiddleware);

const UserSelect = {
  id: true,
  name: true,
  email: true,
  avatar: true,
};

const emptyResponseEventsByStatus = {
  empty: true,
  created: {
    count: 0,
    deltaPrevious: 0,
  },
  completed: {
    count: 0,
    deltaPrevious: 0,
  },
  rescheduled: {
    count: 0,
    deltaPrevious: 0,
  },
  cancelled: {
    count: 0,
    deltaPrevious: 0,
  },
  previousRange: {
    startDate: dayjs().toISOString(),
    endDate: dayjs().toISOString(),
  },
};

export const insightsRouter = router({
  eventsByStatus: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().optional().nullable(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        userId: z.coerce.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, userId } = input;

      if (!input.teamId) {
        return emptyResponseEventsByStatus;
      }

      const whereConditional: Prisma.BookingWhereInput = {
        eventType: {
          teamId: teamId,
        },
      };

      if (eventTypeId) {
        whereConditional["eventTypeId"] = eventTypeId;
      } else if (userId) {
        whereConditional["userId"] = userId;
      }

      // Migrate to use prisma views
      const baseBookings = await EventsInsights.getBaseBookingForEventStatus({
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

      const totalRescheduled = await EventsInsights.getTotalRescheduledEvents(baseBookingIds);

      const totalCancelled = await EventsInsights.getTotalCancelledEvents(baseBookingIds);

      const lastPeriodStartDate = dayjs(startDate).subtract(startTimeEndTimeDiff, "day");
      const lastPeriodEndDate = dayjs(endDate).subtract(startTimeEndTimeDiff, "day");

      const lastPeriodBaseBookings = await EventsInsights.getBaseBookingForEventStatus({
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

      const lastPeriodTotalRescheduled = await EventsInsights.getTotalRescheduledEvents(
        lastPeriodBaseBookingIds
      );

      const lastPeriodTotalCancelled = await EventsInsights.getTotalCancelledEvents(lastPeriodBaseBookingIds);

      return {
        empty: false,
        created: {
          count: baseBookings.length,
          deltaPrevious: EventsInsights.getPercentage(baseBookings.length, lastPeriodBaseBookings.length),
        },
        completed: {
          count: baseBookings.length - totalCancelled - totalRescheduled,
          deltaPrevious: EventsInsights.getPercentage(
            baseBookings.length - totalCancelled - totalRescheduled,
            lastPeriodBaseBookings.length - lastPeriodTotalCancelled - lastPeriodTotalRescheduled
          ),
        },
        rescheduled: {
          count: totalRescheduled,
          deltaPrevious: EventsInsights.getPercentage(totalRescheduled, lastPeriodTotalRescheduled),
        },
        cancelled: {
          count: totalCancelled,
          deltaPrevious: EventsInsights.getPercentage(totalCancelled, lastPeriodTotalCancelled),
        },
        previousRange: {
          startDate: lastPeriodStartDate.format("YYYY-MM-DD"),
          endDate: lastPeriodEndDate.format("YYYY-MM-DD"),
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
      const timeline = await EventsInsights.getTimeLine(timeView, dayjs(startDate), dayjs(endDate));

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
          EventsInsights.getCreatedEventsInTimeRange(
            {
              start: startDate,
              end: endDate,
            },
            whereConditional
          ),
          EventsInsights.getCompletedEventsInTimeRange(
            {
              start: startDate,
              end: endDate,
            },
            whereConditional
          ),
          EventsInsights.getRescheduledEventsInTimeRange(
            {
              start: startDate,
              end: endDate,
            },
            whereConditional
          ),
          EventsInsights.getCancelledEventsInTimeRange(
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
        teamId: z.coerce.number().optional().nullable(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, userId } = input;
      const user = ctx.user;

      if (!input.teamId) {
        return [];
      }

      const eventTypeWhere: Prisma.EventTypeWhereInput = {
        teamId: teamId,
      };

      const bookingWhere: Prisma.BookingWhereInput = {
        eventType: eventTypeWhere,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };

      if (userId) {
        bookingWhere.userId = userId;
      }

      const bookingsFromTeam = await ctx.prisma.booking.groupBy({
        by: ["eventTypeId"],
        where: bookingWhere,
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
        teamId: z.coerce.number().optional().nullable(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate: startDateString, endDate: endDateString, userId } = input;

      if (!teamId) {
        return [];
      }

      const user = ctx.user;
      const startDate = dayjs(startDateString);
      const endDate = dayjs(endDateString);

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

      const timeView = EventsInsights.getTimeView("week", startDate, endDate);
      const timeLine = await EventsInsights.getTimeLine("week", startDate, endDate);

      if (!timeLine) {
        return [];
      }

      const dateFormat = "ll";

      const result = [];

      for (const date of timeLine) {
        const EventData = {
          Date: dayjs(date).format(dateFormat),
          Average: 0,
        };
        const startOfEndOf = timeView === "year" ? "year" : timeView === "month" ? "month" : "week";

        const startDate = dayjs(date).startOf(startOfEndOf);
        const endDate = dayjs(date).endOf(startOfEndOf);

        const bookingsInTimeRange = await ctx.prisma.booking.findMany({
          where: {
            ...whereConditional,
            createdAt: {
              gte: startDate.toDate(),
              lte: endDate.toDate(),
            },
          },
          include: {
            eventType: true,
          },
        });

        const avgDuration =
          bookingsInTimeRange.reduce((acc, booking) => {
            const duration = booking.eventType?.length || 0;
            return acc + duration;
          }, 0) / bookingsInTimeRange.length;

        EventData["Average"] = Number(avgDuration) || 0;
        result.push(EventData);
      }

      return result;
    }),
  membersWithMostBookings: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;
      const eventTypeWhere: Prisma.EventTypeWhereInput = {
        teamId: teamId,
      };
      if (eventTypeId) {
        eventTypeWhere["id"] = eventTypeId;
      }

      const bookingsFromTeam = await ctx.prisma.booking.groupBy({
        by: ["userId"],
        where: {
          eventType: eventTypeWhere,
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
      const userIds = bookingsFromTeam
        .filter((booking) => typeof booking.userId === "number")
        .map((booking) => booking.userId);
      const usersFromTeam = await ctx.prisma.user.findMany({
        where: {
          id: {
            in: userIds as number[],
          },
        },
      });

      const userHashMap = new Map();
      usersFromTeam.forEach((user) => {
        userHashMap.set(user.id, user);
      });

      const result = bookingsFromTeam.map((booking) => {
        return {
          userId: booking.userId,
          user: userHashMap.get(booking.userId),
          emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
          count: booking._count.id,
        };
      });
      return result;
    }),
  membersWithLeastBookings: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId } = input;
      if (!teamId) {
        return [];
      }

      const eventTypeWhere: Prisma.EventTypeWhereInput = {
        teamId: teamId,
      };
      if (eventTypeId) {
        eventTypeWhere["id"] = eventTypeId;
      }

      const bookingsFromTeam = await ctx.prisma.booking.groupBy({
        by: ["userId"],
        where: {
          eventType: eventTypeWhere,
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
            id: "asc",
          },
        },
        take: 10,
      });

      // Users are obtained from bookings so if a user has 0 they won't be in the list
      const userIds = bookingsFromTeam
        .filter((booking) => typeof booking.userId === "number")
        .map((booking) => booking.userId);

      const usersWithNoBookings = await ctx.prisma.user.findMany({
        select: UserSelect,
        where: {
          id: {
            notIn: userIds as number[],
          },
          teams: {
            some: {
              teamId: teamId,
            },
          },
        },
      });

      let usersFromTeam: Prisma.UserGetPayload<{
        select: typeof UserSelect;
      }>[] = [];
      if (usersWithNoBookings.length < 10) {
        usersFromTeam = await ctx.prisma.user.findMany({
          where: {
            id: {
              in: userIds as number[],
            },
          },
          select: UserSelect,
          take: 10 - usersWithNoBookings.length,
        });
      }

      const userHashMap = new Map();
      [...usersWithNoBookings, ...usersFromTeam].forEach((user) => {
        userHashMap.set(user.id, user);
      });

      const result = bookingsFromTeam.map((booking) => {
        const user = userHashMap.get(booking.userId);
        return {
          userId: booking.userId,
          user,
          emailMd5: crypto.createHash("md5").update(user.email).digest("hex"),
          count: booking._count.id,
          Username: user.name || "No Username found",
        };
      });

      return result;
    }),
  teamListForUser: authedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    // Look if user it's admin in multiple teams
    const belongsToTeams = await ctx.prisma.membership.findMany({
      where: {
        userId: user.id,
        team: {
          slug: { not: null },
        },
        OR: [
          {
            role: "ADMIN",
          },
          {
            role: "OWNER",
          },
        ],
      },
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logo: true,
            slug: true,
          },
        },
      },
    });
    const result = belongsToTeams.map((membership) => membership.team);

    return result;
  }),
  userList: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;

      if (!input.teamId) {
        return [];
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: user.id,
          teamId: input.teamId,
        },
        include: {
          user: {
            select: UserSelect,
          },
        },
      });

      // If user is not admin, return himself only
      if (membership && membership.role === "MEMBER") {
        return [membership.user];
      }
      const usersInTeam = await ctx.prisma.membership.findMany({
        where: {
          teamId: input.teamId,
        },
        include: {
          user: {
            select: UserSelect,
          },
        },
      });
      return usersInTeam.map((membership) => membership.user);
    }),
  eventTypeList: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;

      if (!input.teamId) {
        return [];
      }

      const membership = await ctx.prisma.membership.findFirst({
        where: {
          userId: user.id,
          teamId: input.teamId,
        },
      });

      if (membership && membership.role === "MEMBER") {
        const eventTypes = await ctx.prisma.eventType.findMany({
          where: {
            teamId: input.teamId,
            // user its listed as direct user or as part of a group
            OR: [
              {
                userId: user.id,
              },
              {
                users: {
                  some: {
                    id: user.id,
                  },
                },
              },
            ],
          },
        });

        return eventTypes;
      }

      const eventTypes = await ctx.prisma.eventType.findMany({
        where: {
          teamId: input.teamId,
        },
      });

      return eventTypes;
    }),
});
