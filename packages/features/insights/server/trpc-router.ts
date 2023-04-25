import type { Prisma } from "@prisma/client";
import crypto from "crypto";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { authedProcedure, isAuthed, router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { EventsInsights } from "./events";

const UserBelongsToTeamInput = z.object({
  teamId: z.coerce.number().optional().nullable(),
});

const userBelongsToTeamMiddleware = isAuthed.unstable_pipe(async ({ ctx, next, rawInput }) => {
  const parse = UserBelongsToTeamInput.safeParse(rawInput);
  if (!parse.success) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  // If teamId is provided, check if user belongs to team
  // If teamId is not provided, check if user belongs to any team

  const membershipWhereConditional: Prisma.MembershipWhereInput = {
    userId: ctx.user.id,
  };

  if (parse.data.teamId) {
    membershipWhereConditional["teamId"] = parse.data.teamId;
  }

  const membership = await ctx.prisma.membership.findFirst({
    where: membershipWhereConditional,
  });

  if (!membership) {
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
        memberUserId: z.coerce.number().optional(),
        userId: z.coerce.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, memberUserId, userId } = input;

      if (userId && userId !== ctx.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      let whereConditional: Prisma.BookingTimeStatusWhereInput = {};

      if (eventTypeId) {
        whereConditional["eventTypeId"] = eventTypeId;
      }
      if (memberUserId) {
        whereConditional["userId"] = memberUserId;
      }
      if (userId) {
        whereConditional["teamId"] = null;
        whereConditional["userId"] = userId;
      }

      if (teamId) {
        const usersFromTeam = await ctx.prisma.membership.findMany({
          where: {
            teamId: teamId,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromTeam = usersFromTeam.map((u) => u.userId);
        whereConditional = {
          ...whereConditional,
          OR: [
            {
              teamId,
            },
            {
              userId: {
                in: userIdsFromTeam,
              },
              teamId: null,
            },
          ],
        };
      }

      // Migrate to use prisma views
      const baseBookings = await EventsInsights.getBaseBookingForEventStatus({
        ...whereConditional,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
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
        teamId: teamId,
      });

      const lastPeriodBaseBookingIds = lastPeriodBaseBookings.map((b) => b.id);

      const lastPeriodTotalRescheduled = await EventsInsights.getTotalRescheduledEvents(
        lastPeriodBaseBookingIds
      );

      const lastPeriodTotalCancelled = await EventsInsights.getTotalCancelledEvents(lastPeriodBaseBookingIds);
      const result = {
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
      if (
        result.created.count === 0 &&
        result.completed.count === 0 &&
        result.rescheduled.count === 0 &&
        result.cancelled.count === 0
      ) {
        return emptyResponseEventsByStatus;
      }
      return result;
    }),
  eventsTimeline: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().optional().nullable(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        memberUserId: z.coerce.number().optional(),
        timeView: z.enum(["week", "month", "year"]),
        userId: z.coerce.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        teamId,
        startDate: startDateString,
        endDate: endDateString,
        eventTypeId,
        memberUserId,
        timeView: inputTimeView,
        userId: selfUserId,
      } = input;

      const startDate = dayjs(startDateString);
      const endDate = dayjs(endDateString);
      const user = ctx.user;

      if (selfUserId && user?.id !== selfUserId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (!teamId && !selfUserId) {
        return [];
      }

      const timeView = inputTimeView;

      let whereConditional: Prisma.BookingTimeStatusWhereInput = {};

      if (teamId) {
        const usersFromTeam = await ctx.prisma.membership.findMany({
          where: {
            teamId,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromTeams = usersFromTeam.map((u) => u.userId);

        whereConditional = {
          OR: [
            {
              teamId,
            },
            {
              userId: {
                in: userIdsFromTeams,
              },
              teamId: null,
            },
          ],
        };
      }

      if (memberUserId) {
        whereConditional = {
          ...whereConditional,
          userId: memberUserId,
        };
      }

      if (eventTypeId && !!whereConditional) {
        whereConditional = {
          eventTypeId: eventTypeId,
        };
      }

      if (selfUserId && !!whereConditional) {
        // In this delete we are deleting the teamId filter
        whereConditional["userId"] = selfUserId;
        whereConditional["teamId"] = null;
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
        memberUserId: z.coerce.number().optional(),
        teamId: z.coerce.number().optional().nullable(),
        startDate: z.string(),
        endDate: z.string(),
        userId: z.coerce.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, memberUserId, userId } = input;

      const user = ctx.user;

      if (userId && user?.id !== userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (!teamId && !userId) {
        return [];
      }

      let bookingWhere: Prisma.BookingTimeStatusWhereInput = {
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };
      if (teamId) {
        const usersFromTeam = await ctx.prisma.membership.findMany({
          where: {
            teamId,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromTeams = usersFromTeam.map((u) => u.userId);

        bookingWhere = {
          ...bookingWhere,
          OR: [
            {
              teamId,
            },
            {
              userId: {
                in: userIdsFromTeams,
              },
              teamId: null,
            },
          ],
        };
      }

      if (userId) {
        bookingWhere.userId = userId;
        // Don't take bookings from any team
        bookingWhere.teamId = null;
      }

      if (memberUserId) {
        bookingWhere.userId = memberUserId;
      }

      const bookingsFromSelected = await ctx.prisma.bookingTimeStatus.groupBy({
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

      const eventTypeIds = bookingsFromSelected
        .filter((booking) => typeof booking.eventTypeId === "number")
        .map((booking) => booking.eventTypeId);

      const eventTypeWhereConditional: Prisma.EventTypeWhereInput = {
        id: {
          in: eventTypeIds as number[],
        },
      };

      const eventTypesFrom = await ctx.prisma.eventType.findMany({
        select: {
          id: true,
          title: true,
          teamId: true,
          userId: true,
          slug: true,
          users: {
            select: {
              username: true,
            },
          },
          team: {
            select: {
              slug: true,
            },
          },
        },
        where: eventTypeWhereConditional,
      });

      const eventTypeHashMap: Map<
        number,
        Prisma.EventTypeGetPayload<{
          select: {
            id: true;
            title: true;
            teamId: true;
            userId: true;
            slug: true;
            users: {
              select: {
                username: true;
              };
            };
            team: {
              select: {
                slug: true;
              };
            };
          };
        }>
      > = new Map();
      eventTypesFrom.forEach((eventType) => {
        eventTypeHashMap.set(eventType.id, eventType);
      });

      const result = bookingsFromSelected.map((booking) => {
        const eventTypeSelected = eventTypeHashMap.get(booking.eventTypeId ?? 0);
        if (!eventTypeSelected) {
          return {};
        }

        let eventSlug = "";
        if (eventTypeSelected.userId) {
          eventSlug = `${eventTypeSelected?.users[0]?.username}/${eventTypeSelected?.slug}`;
        }
        if (eventTypeSelected?.team && eventTypeSelected?.team?.slug) {
          eventSlug = `${eventTypeSelected.team.slug}/${eventTypeSelected.slug}`;
        }
        return {
          eventTypeId: booking.eventTypeId,
          eventTypeName: eventSlug,
          count: booking._count.id,
        };
      });

      return result;
    }),
  averageEventDuration: userBelongsToTeamProcedure
    .input(
      z.object({
        memberUserId: z.coerce.number().optional(),
        teamId: z.coerce.number().optional().nullable(),
        startDate: z.string(),
        endDate: z.string(),
        userId: z.coerce.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate: startDateString, endDate: endDateString, memberUserId, userId } = input;

      if (userId && ctx.user?.id !== userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (!teamId && !userId) {
        return [];
      }

      const startDate = dayjs(startDateString);
      const endDate = dayjs(endDateString);

      let whereConditional: Prisma.BookingTimeStatusWhereInput = {
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };
      if (userId) {
        delete whereConditional.teamId;
        whereConditional["userId"] = userId;
      }

      if (teamId) {
        const usersFromTeam = await ctx.prisma.membership.findMany({
          where: {
            teamId,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromTeams = usersFromTeam.map((u) => u.userId);

        whereConditional = {
          ...whereConditional,
          OR: [
            {
              teamId,
            },
            {
              userId: {
                in: userIdsFromTeams,
              },
              teamId: null,
            },
          ],
        };
      }

      if (memberUserId) {
        whereConditional = {
          userId: memberUserId,
          teamId,
        };
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

        const bookingsInTimeRange = await ctx.prisma.bookingTimeStatus.findMany({
          select: {
            eventLength: true,
          },
          where: {
            ...whereConditional,
            createdAt: {
              gte: startDate.toDate(),
              lte: endDate.toDate(),
            },
          },
        });

        const avgDuration =
          bookingsInTimeRange.reduce((acc, booking) => {
            const duration = booking.eventLength || 0;
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

      const bookingWhere: Prisma.BookingTimeStatusWhereInput = {
        teamId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };

      if (eventTypeId) {
        bookingWhere.eventTypeId = eventTypeId;
      }

      if (teamId) {
        const usersFromTeam = await ctx.prisma.membership.findMany({
          where: {
            teamId,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromTeams = usersFromTeam.map((u) => u.userId);
        delete bookingWhere.eventTypeId;
        delete bookingWhere.teamId;
        bookingWhere["OR"] = [
          {
            teamId,
          },
          {
            userId: {
              in: userIdsFromTeams,
            },
            teamId: null,
          },
        ];
      }

      const bookingsFromTeam = await ctx.prisma.bookingTimeStatus.groupBy({
        by: ["userId"],
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

      const userIds = bookingsFromTeam
        .filter((booking) => typeof booking.userId === "number")
        .map((booking) => booking.userId);
      if (userIds.length === 0) {
        return [];
      }
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
          emailMd5: crypto.createHash("md5").update(user?.email).digest("hex"),
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
      const user = ctx.user;

      const bookingWhere: Prisma.BookingTimeStatusWhereInput = {
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };

      if (teamId) {
        const usersFromTeam = await ctx.prisma.membership.findMany({
          where: {
            teamId,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromTeams = usersFromTeam.map((u) => u.userId);
        bookingWhere["OR"] = [
          {
            teamId,
          },
          {
            userId: {
              in: userIdsFromTeams,
            },
            teamId: null,
          },
        ];
      }

      const bookingsFromTeam = await ctx.prisma.bookingTimeStatus.groupBy({
        by: ["userId"],
        where: bookingWhere,
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

      const userIds = bookingsFromTeam
        .filter((booking) => typeof booking.userId === "number")
        .map((booking) => booking.userId);
      if (userIds.length === 0) {
        return [];
      }
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
          emailMd5: crypto.createHash("md5").update(user?.email).digest("hex"),
          count: booking._count.id,
        };
      });

      return result;
    }),
  teamListForUser: authedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    // Fetch user data
    const userData = await ctx.prisma.user.findUnique({
      where: {
        id: user.id,
      },
      select: {
        id: true,
        name: true,
        avatar: true,
      },
    });

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

    const result: {
      id: number;
      slug: string | null;
      name: string | null;
      logo: string | null;
      userId?: number;
    }[] = belongsToTeams.map((membership) => {
      return { ...membership.team };
    });
    if (userData && userData.id) {
      result.push({
        id: 0,
        slug: "",
        userId: userData.id,
        name: userData.name,
        logo: userData.avatar,
      });
    }
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
        teamId: z.coerce.number().optional().nullable(),
        userId: z.coerce.number().optional().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma, user } = ctx;
      const { teamId, userId } = input;

      if (!teamId && !userId) {
        return [];
      }

      const membershipWhereConditional: Prisma.MembershipWhereInput = {};
      if (teamId) {
        membershipWhereConditional["teamId"] = teamId;
        membershipWhereConditional["userId"] = user.id;
      }
      if (userId) {
        membershipWhereConditional["userId"] = userId;
      }

      // I'm not using unique here since when userId comes from input we should look for every
      // event type that user owns
      const membership = await prisma.membership.findFirst({
        where: membershipWhereConditional,
      });

      if (!membership) {
        throw new Error("User is not part of a team");
      }

      const eventTypeWhereConditional: Prisma.EventTypeWhereInput = {};
      if (teamId) {
        eventTypeWhereConditional["teamId"] = teamId;
      }
      if (userId) {
        eventTypeWhereConditional["userId"] = userId;
      }
      let eventTypeResult: Prisma.EventTypeGetPayload<{
        select: {
          id: true;
          slug: true;
          teamId: true;
          title: true;
        };
      }>[] = [];

      switch (membership?.role) {
        case "MEMBER":
          eventTypeWhereConditional["OR"] = {
            userId: user.id,
            users: { some: { id: user.id } },
            // @TODO this is not working as expected
            // hosts: { some: { id: user.id } },
          };
          eventTypeResult = await prisma.eventType.findMany({
            select: {
              id: true,
              slug: true,
              teamId: true,
              title: true,
            },
            where: eventTypeWhereConditional,
          });
          break;

        default:
          eventTypeResult = await prisma.eventType.findMany({
            select: {
              id: true,
              slug: true,
              teamId: true,
              title: true,
            },
            where: eventTypeWhereConditional,
          });
          break;
      }
      return eventTypeResult;
    }),
});
