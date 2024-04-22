import type { Prisma } from "@prisma/client";
import md5 from "md5";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { rawDataInputSchema } from "@calcom/features/insights/server/raw-data.schema";
import { randomString } from "@calcom/lib/random";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { EventsInsights } from "./events";

const UserBelongsToTeamInput = z.object({
  teamId: z.coerce.number().optional().nullable(),
  isAll: z.boolean().optional(),
});

const buildHashMapForUsers = <
  T extends { avatarUrl: string | null; id: number; username: string | null; [key: string]: unknown }
>(
  usersFromTeam: T[]
) => {
  const userHashMap = new Map<number | null, Omit<T, "avatarUrl"> & { avatarUrl: string }>();
  usersFromTeam.forEach((user) => {
    userHashMap.set(user.id, {
      ...user,
      // TODO: Use AVATAR_FALLBACK when avatar.png endpoint is fased out
      avatarUrl: user.avatarUrl || `/${user.username}/avatar.png`,
    });
  });
  return userHashMap;
};

const userBelongsToTeamProcedure = authedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const parse = UserBelongsToTeamInput.safeParse(await getRawInput());
  if (!parse.success) {
    throw new TRPCError({ code: "BAD_REQUEST" });
  }

  // If teamId is provided, check if user belongs to team
  // If teamId is not provided, check if user belongs to any team

  const membershipWhereConditional: Prisma.MembershipWhereInput = {
    userId: ctx.user.id,
    accepted: true,
  };

  if (parse.data.teamId) {
    membershipWhereConditional["teamId"] = parse.data.teamId;
  }

  const membership = await ctx.insightsDb.membership.findFirst({
    where: membershipWhereConditional,
  });

  let isOwnerAdminOfParentTeam = false;
  // Probably we couldn't find a membership because the user is not a direct member of the team
  // So that would mean ctx.user.organization is present
  if ((parse.data.isAll && ctx.user.organizationId) || (!membership && ctx.user.organizationId)) {
    //Look for membership type in organizationId
    const membershipOrg = await ctx.insightsDb.membership.findFirst({
      where: {
        userId: ctx.user.id,
        teamId: ctx.user.organizationId,
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });
    if (!membershipOrg) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    isOwnerAdminOfParentTeam = true;
  }

  return next({
    ctx: {
      user: {
        ...ctx.user,
        isOwnerAdminOfParentTeam,
      },
    },
  });
});

const userSelect = {
  id: true,
  name: true,
  email: true,
  username: true,
  avatarUrl: true,
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
  rating: {
    count: 0,
    deltaPrevious: 0,
  },
  no_show: {
    count: 0,
    deltaPrevious: 0,
  },
  csat: {
    count: 0,
    deltaPrevious: 0,
  },
  previousRange: {
    startDate: dayjs().toISOString(),
    endDate: dayjs().toISOString(),
  },
};

export interface IResultTeamList {
  id: number;
  slug: string | null;
  name: string | null;
  logoUrl: string | null;
  userId?: number;
  isOrg?: boolean;
}

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
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, memberUserId, userId, isAll } = input;
      if (userId && userId !== ctx.user.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      let whereConditional: Prisma.BookingTimeStatusWhereInput = {};
      let teamConditional: Prisma.TeamWhereInput = {};

      if (eventTypeId) {
        whereConditional["OR"] = [
          {
            eventTypeId,
          },
          {
            eventParentId: eventTypeId,
          },
        ];
      }
      if (memberUserId) {
        whereConditional["userId"] = memberUserId;
      }
      if (userId) {
        whereConditional["teamId"] = null;
        whereConditional["userId"] = userId;
      }

      if (isAll && ctx.user.isOwnerAdminOfParentTeam && ctx.user.organizationId) {
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: ctx.user.organizationId,
          },
          select: {
            id: true,
          },
        });
        if (teamsFromOrg.length === 0) {
          return emptyResponseEventsByStatus;
        }
        teamConditional = {
          id: {
            in: [ctx.user.organizationId, ...teamsFromOrg.map((t) => t.id)],
          },
        };
        const usersFromOrg = await ctx.insightsDb.membership.findMany({
          where: {
            team: teamConditional,
            accepted: true,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromOrg = usersFromOrg.map((u) => u.userId);
        whereConditional = {
          ...whereConditional,
          OR: [
            {
              userId: {
                in: userIdsFromOrg,
              },
              teamId: null,
            },
            {
              teamId: {
                in: [ctx.user.organizationId, ...teamsFromOrg.map((t) => t.id)],
              },
            },
          ],
        };
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: teamId,
            accepted: true,
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

      const baseWhereCondition = {
        ...whereConditional,
        createdAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      };

      const baseBookingsCount = await EventsInsights.getBaseBookingCountForEventStatus(baseWhereCondition);

      const startTimeEndTimeDiff = dayjs(endDate).diff(dayjs(startDate), "day");

      const totalCompleted = await EventsInsights.getTotalCompletedEvents(baseWhereCondition);

      const totalRescheduled = await EventsInsights.getTotalRescheduledEvents(baseWhereCondition);

      const totalCancelled = await EventsInsights.getTotalCancelledEvents(baseWhereCondition);

      const totalRatingsAggregate = await EventsInsights.getAverageRating(baseWhereCondition);
      const averageRating = totalRatingsAggregate._avg.rating
        ? parseFloat(totalRatingsAggregate._avg.rating.toFixed(1))
        : 0;

      const totalNoShow = await EventsInsights.getTotalNoShows(baseWhereCondition);
      const totalCSAT = await EventsInsights.getTotalCSAT(baseWhereCondition);

      const lastPeriodStartDate = dayjs(startDate).subtract(startTimeEndTimeDiff, "day");
      const lastPeriodEndDate = dayjs(endDate).subtract(startTimeEndTimeDiff, "day");

      const lastPeriodBaseCondition = {
        ...whereConditional,
        createdAt: {
          gte: lastPeriodStartDate.toDate(),
          lte: lastPeriodEndDate.toDate(),
        },
        teamId: teamId,
      };

      const lastPeriodBaseBookingsCount = await EventsInsights.getBaseBookingCountForEventStatus(
        lastPeriodBaseCondition
      );

      const lastPeriodTotalRescheduled = await EventsInsights.getTotalRescheduledEvents(
        lastPeriodBaseCondition
      );

      const lastPeriodTotalCancelled = await EventsInsights.getTotalCancelledEvents(lastPeriodBaseCondition);
      const lastPeriodTotalRatingsAggregate = await EventsInsights.getAverageRating(lastPeriodBaseCondition);
      const lastPeriodAverageRating = lastPeriodTotalRatingsAggregate._avg.rating
        ? parseFloat(lastPeriodTotalRatingsAggregate._avg.rating.toFixed(1))
        : 0;

      const lastPeriodTotalNoShow = await EventsInsights.getTotalNoShows(lastPeriodBaseCondition);
      const lastPeriodTotalCSAT = await EventsInsights.getTotalCSAT(lastPeriodBaseCondition);

      const result = {
        empty: false,
        created: {
          count: baseBookingsCount,
          deltaPrevious: EventsInsights.getPercentage(baseBookingsCount, lastPeriodBaseBookingsCount),
        },
        completed: {
          count: totalCompleted,
          deltaPrevious: EventsInsights.getPercentage(
            baseBookingsCount - totalCancelled - totalRescheduled,
            lastPeriodBaseBookingsCount - lastPeriodTotalCancelled - lastPeriodTotalRescheduled
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
        no_show: {
          count: totalNoShow,
          deltaPrevious: EventsInsights.getPercentage(totalNoShow, lastPeriodTotalNoShow),
        },
        rating: {
          count: averageRating,
          deltaPrevious: EventsInsights.getPercentage(averageRating, lastPeriodAverageRating),
        },
        csat: {
          count: totalCSAT,
          deltaPrevious: EventsInsights.getPercentage(totalCSAT, lastPeriodTotalCSAT),
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
        result.cancelled.count === 0 &&
        result.no_show.count === 0 &&
        result.rating.count === 0
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
        timeView: z.enum(["week", "month", "year", "day"]),
        userId: z.coerce.number().optional(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        teamId,
        eventTypeId,
        memberUserId,
        isAll,
        startDate: startDateString,
        endDate: endDateString,
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

      let timeView = inputTimeView;

      if (timeView === "week") {
        // Difference between start and end date is less than 14 days use day view
        if (endDate.diff(startDate, "day") < 14) {
          timeView = "day";
        }
      }

      let whereConditional: Prisma.BookingTimeStatusWhereInput = {};

      if (isAll && ctx.user.isOwnerAdminOfParentTeam && ctx.user.organizationId) {
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: user.organizationId,
          },
          select: {
            id: true,
          },
        });

        const usersFromOrg = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: {
              in: [ctx.user.organizationId, ...teamsFromOrg.map((t) => t.id)],
            },
            accepted: true,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromOrg = usersFromOrg.map((u) => u.userId);

        whereConditional = {
          OR: [
            {
              userId: {
                in: userIdsFromOrg,
              },
              teamId: null,
            },
            {
              teamId: {
                in: [ctx.user.organizationId, ...teamsFromOrg.map((t) => t.id)],
              },
            },
          ],
        };
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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
          OR: [
            {
              eventTypeId,
            },
            {
              eventParentId: eventTypeId,
            },
          ],
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
          "No-Show (Host)": 0,
        };
        const startOfEndOf = timeView;
        let startDate = dayjs(date).startOf(startOfEndOf);
        let endDate = dayjs(date).endOf(startOfEndOf);
        if (timeView === "week") {
          startDate = dayjs(date).startOf("day");
          endDate = dayjs(date).add(6, "day").endOf("day");
        }
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
          EventsInsights.getNoShowHostsInTimeRange(
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
        EventData["No-Show (Host)"] = promisesResult[4];
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
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, memberUserId, userId, isAll } = input;

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

      if (isAll && ctx.user.isOwnerAdminOfParentTeam && ctx.user.organizationId) {
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: user.organizationId,
          },
          select: {
            id: true,
          },
        });

        const usersFromOrg = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: {
              in: [ctx.user.organizationId, ...teamsFromOrg.map((t) => t.id)],
            },
            accepted: true,
          },
          select: {
            userId: true,
          },
        });
        const userIdsFromOrg = usersFromOrg.map((u) => u.userId);

        bookingWhere = {
          ...bookingWhere,
          OR: [
            {
              userId: {
                in: userIdsFromOrg,
              },
              teamId: null,
            },
            {
              teamId: {
                in: [ctx.user.organizationId, ...teamsFromOrg.map((t) => t.id)],
              },
            },
          ],
        };
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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

      const bookingsFromSelected = await ctx.insightsDb.bookingTimeStatus.groupBy({
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

      const eventTypesFrom = await ctx.insightsDb.eventType.findMany({
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
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const {
        teamId,
        startDate: startDateString,
        endDate: endDateString,
        memberUserId,
        userId,
        isAll,
      } = input;

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

      if (isAll && ctx.user.isOwnerAdminOfParentTeam && ctx.user.organizationId) {
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: ctx.user?.organizationId,
          },
          select: {
            id: true,
          },
        });
        whereConditional = {
          ...whereConditional,
          OR: [
            {
              teamId: {
                in: [ctx.user?.organizationId, ...teamsFromOrg.map((t) => t.id)],
              },
            },
            {
              userId: ctx.user?.id,
              teamId: null,
            },
          ],
        };
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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

        const bookingsInTimeRange = await ctx.insightsDb.bookingTimeStatus.findMany({
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
        teamId: z.coerce.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll } = input;

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
        bookingWhere["OR"] = [
          {
            eventTypeId,
          },
          {
            eventParentId: eventTypeId,
          },
        ];
      }

      if (isAll && user.isOwnerAdminOfParentTeam && user.organizationId) {
        delete bookingWhere.teamId;
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: user?.organizationId,
          },
          select: {
            id: true,
          },
        });
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: {
              in: [user?.organizationId, ...teamsFromOrg.map((t) => t.id)],
            },
            accepted: true,
          },
          select: {
            userId: true,
          },
        });
        bookingWhere["OR"] = [
          {
            teamId: {
              in: [user?.organizationId, ...teamsFromOrg.map((t) => t.id)],
            },
          },
          {
            userId: {
              in: usersFromTeam.map((u) => u.userId),
            },
            teamId: null,
          },
        ];
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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

      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatus.groupBy({
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

      const userIds = bookingsFromTeam.reduce((userIds: number[], booking) => {
        if (typeof booking.userId === "number" && !userIds.includes(booking.userId)) {
          userIds.push(booking.userId);
        }
        return userIds;
      }, []);

      if (userIds.length === 0) {
        return [];
      }

      const usersFromTeam = await ctx.insightsDb.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: userSelect,
      });

      const userHashMap = buildHashMapForUsers(usersFromTeam);

      const result = bookingsFromTeam.map((booking) => {
        return {
          userId: booking.userId,
          // We know with 100% certainty that userHashMap.get(...) will retrieve a user
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          user: userHashMap.get(booking.userId)!,
          emailMd5: md5(user?.email),
          count: booking._count.id,
        };
      });

      return result;
    }),
  membersWithLeastBookings: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const bookingWhere: Prisma.BookingTimeStatusWhereInput = {
        teamId,
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };

      if (isAll && user.isOwnerAdminOfParentTeam) {
        delete bookingWhere.teamId;
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: user?.organizationId,
          },
          select: {
            id: true,
          },
        });
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
            accepted: true,
          },
          select: {
            userId: true,
          },
        });

        bookingWhere["OR"] = [
          {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
          },
          {
            userId: {
              in: usersFromTeam.map((u) => u.userId),
            },
            teamId: null,
          },
        ];
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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

      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatus.groupBy({
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

      const userIds = bookingsFromTeam.reduce((userIds: number[], booking) => {
        if (typeof booking.userId === "number" && !userIds.includes(booking.userId)) {
          userIds.push(booking.userId);
        }
        return userIds;
      }, []);

      if (userIds.length === 0) {
        return [];
      }
      const usersFromTeam = await ctx.insightsDb.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: userSelect,
      });

      const userHashMap = buildHashMapForUsers(usersFromTeam);

      const result = bookingsFromTeam.map((booking) => ({
        userId: booking.userId,
        // We know with 100% certainty that userHashMap.get(...) will retrieve a user
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        user: userHashMap.get(booking.userId)!,
        emailMd5: md5(user?.email),
        count: booking._count.id,
      }));

      return result;
    }),
  teamListForUser: authedProcedure.query(async ({ ctx }) => {
    const user = ctx.user;

    // Fetch user data
    const userData = await ctx.insightsDb.user.findUnique({
      where: {
        id: user.id,
      },
      select: userSelect,
    });

    if (!userData) {
      return [];
    }

    const membershipConditional: Prisma.MembershipWhereInput = {
      team: {
        slug: { not: null },
      },
      accepted: true,
      userId: user.id,
      OR: [
        {
          role: "ADMIN",
        },
        {
          role: "OWNER",
        },
      ],
    };

    // Validate if user belongs to org as admin/owner
    if (user.organizationId) {
      const teamsFromOrg = await ctx.insightsDb.team.findMany({
        where: {
          parentId: user.organizationId,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      });
      const orgTeam = await ctx.insightsDb.team.findUnique({
        where: {
          id: user.organizationId,
        },
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      });
      if (!orgTeam) {
        return [];
      }

      const result: IResultTeamList[] = [
        {
          id: orgTeam.id,
          slug: orgTeam.slug,
          name: orgTeam.name,
          logoUrl: orgTeam.logoUrl,
          isOrg: true,
        },
        ...teamsFromOrg.map(
          (team: Prisma.TeamGetPayload<{ select: { id: true; slug: true; name: true; logoUrl: true } }>) => {
            return {
              ...team,
            };
          }
        ),
      ];

      return result;
    }

    // Look if user it's admin/owner in multiple teams
    const belongsToTeams = await ctx.insightsDb.membership.findMany({
      where: membershipConditional,
      include: {
        team: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            slug: true,
            metadata: true,
          },
        },
      },
    });

    if (belongsToTeams.length === 0) {
      return [];
    }

    const result: IResultTeamList[] = belongsToTeams.map((membership) => {
      return { ...membership.team };
    });

    return result;
  }),
  userList: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable(),
        isAll: z.boolean().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      const { teamId, isAll } = input;

      if (!teamId) {
        return [];
      }

      if (isAll && user.organizationId && user.isOwnerAdminOfParentTeam) {
        const usersInTeam = await ctx.insightsDb.membership.findMany({
          where: {
            team: {
              parentId: user.organizationId,
            },
          },
          include: {
            user: {
              select: userSelect,
            },
          },
          distinct: ["userId"],
        });
        return usersInTeam.map((membership) => membership.user);
      }

      const membership = await ctx.insightsDb.membership.findFirst({
        where: {
          userId: user.id,
          teamId,
          accepted: true,
        },
        include: {
          user: {
            select: userSelect,
          },
        },
      });
      if (!membership) {
        return [];
      }
      const isMember = membership && membership.role === "MEMBER";
      // If user is not admin, return himself only
      if (isMember) {
        return [membership.user];
      }

      const usersInTeam = await ctx.insightsDb.membership.findMany({
        where: {
          teamId,
          accepted: true,
        },
        include: {
          user: {
            select: userSelect,
          },
        },
        distinct: ["userId"],
      });

      return usersInTeam.map((membership) => membership.user);
    }),
  eventTypeList: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().optional().nullable(),
        userId: z.coerce.number().optional().nullable(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { prisma, user } = ctx;
      const { teamId, userId, isAll } = input;

      if (!teamId && !userId) {
        return [];
      }

      const membershipWhereConditional: Prisma.MembershipWhereInput = {};

      let childrenTeamIds: number[] = [];

      if (isAll && teamId && user.organizationId && user.isOwnerAdminOfParentTeam) {
        const childTeams = await prisma.team.findMany({
          where: {
            parentId: user.organizationId,
          },
          select: {
            id: true,
          },
        });
        if (childTeams.length > 0) {
          childrenTeamIds = childTeams.map((team) => team.id);
        }
        membershipWhereConditional["teamId"] = {
          in: [user.organizationId, ...childrenTeamIds],
        };
      }

      if (teamId && !isAll) {
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

      if (!membership && !user.isOwnerAdminOfParentTeam) {
        throw new Error("User is not part of a team/org");
      }

      const eventTypeWhereConditional: Prisma.EventTypeWhereInput = {};
      if (isAll && childrenTeamIds.length > 0 && user.organizationId && user.isOwnerAdminOfParentTeam) {
        eventTypeWhereConditional["teamId"] = {
          in: [user.organizationId, ...childrenTeamIds],
        };
      }
      if (teamId && !isAll) {
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
          team: {
            select: {
              name: true;
            };
          };
        };
      }>[] = [];

      let isMember = membership?.role === "MEMBER";
      if (user.isOwnerAdminOfParentTeam) {
        isMember = false;
      }
      if (isMember) {
        eventTypeWhereConditional["OR"] = [
          { userId: user.id },
          { users: { some: { id: user.id } } },
          // @TODO this is not working as expected
          // hosts: { some: { id: user.id } },
        ];
      }
      eventTypeResult = await prisma.eventType.findMany({
        select: {
          id: true,
          slug: true,
          title: true,
          teamId: true,
          team: {
            select: {
              name: true,
            },
          },
        },
        where: eventTypeWhereConditional,
      });

      return eventTypeResult;
    }),
  recentRatings: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const bookingWhere: Prisma.BookingTimeStatusWhereInput = {
        teamId,
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
        ratingFeedback: { not: null },
      };

      if (isAll && user.isOwnerAdminOfParentTeam) {
        delete bookingWhere.teamId;
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: user?.organizationId,
          },
          select: {
            id: true,
          },
        });
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
            accepted: true,
          },
          select: {
            userId: true,
          },
        });

        bookingWhere["OR"] = [
          {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
          },
          {
            userId: {
              in: usersFromTeam.map((u) => u.userId),
            },
            teamId: null,
          },
        ];
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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
      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatus.findMany({
        where: bookingWhere,
        orderBy: {
          endTime: "desc",
        },
        select: {
          userId: true,
          rating: true,
          ratingFeedback: true,
        },
        take: 10,
      });

      const userIds = bookingsFromTeam.reduce((userIds: number[], booking) => {
        if (!!booking.userId && !userIds.includes(booking.userId)) {
          userIds.push(booking.userId);
        }
        return userIds;
      }, []);

      if (userIds.length === 0) {
        return [];
      }
      const usersFromTeam = await ctx.insightsDb.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: userSelect,
      });

      const userHashMap = buildHashMapForUsers(usersFromTeam);

      const result = bookingsFromTeam.map((booking) => ({
        userId: booking.userId,
        // We know with 100% certainty that userHashMap.get(...) will retrieve a user
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        user: userHashMap.get(booking.userId)!,
        emailMd5: md5(user?.email),
        rating: booking.rating,
        feedback: booking.ratingFeedback,
      }));

      return result;
    }),
  membersWithMostNoShow: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const bookingWhere: Prisma.BookingTimeStatusWhereInput = {
        teamId,
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
        noShowHost: true,
      };

      if (isAll && user.isOwnerAdminOfParentTeam) {
        delete bookingWhere.teamId;
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: user?.organizationId,
          },
          select: {
            id: true,
          },
        });
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
            accepted: true,
          },
          select: {
            userId: true,
          },
        });

        bookingWhere["OR"] = [
          {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
          },
          {
            userId: {
              in: usersFromTeam.map((u) => u.userId),
            },
            teamId: null,
          },
        ];
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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
      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatus.groupBy({
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

      const userIds = bookingsFromTeam.reduce((userIds: number[], booking) => {
        if (typeof booking.userId === "number" && !userIds.includes(booking.userId)) {
          userIds.push(booking.userId);
        }
        return userIds;
      }, []);

      if (userIds.length === 0) {
        return [];
      }
      const usersFromTeam = await ctx.insightsDb.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: userSelect,
      });

      const userHashMap = buildHashMapForUsers(usersFromTeam);

      const result = bookingsFromTeam.map((booking) => ({
        userId: booking.userId,
        // We know with 100% certainty that userHashMap.get(...) will retrieve a user
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        user: userHashMap.get(booking.userId)!,
        emailMd5: md5(user?.email),
        count: booking._count.id,
      }));

      return result;
    }),
  membersWithHighestRatings: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const bookingWhere: Prisma.BookingTimeStatusWhereInput = {
        teamId,
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
        rating: { not: null },
      };

      if (isAll && user.isOwnerAdminOfParentTeam) {
        delete bookingWhere.teamId;
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: user?.organizationId,
          },
          select: {
            id: true,
          },
        });
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
            accepted: true,
          },
          select: {
            userId: true,
          },
        });

        bookingWhere["OR"] = [
          {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
          },
          {
            userId: {
              in: usersFromTeam.map((u) => u.userId),
            },
            teamId: null,
          },
        ];
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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
      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatus.groupBy({
        by: ["userId"],
        where: bookingWhere,
        _avg: {
          rating: true,
        },
        orderBy: {
          _avg: {
            rating: "desc",
          },
        },
        take: 10,
      });

      const userIds = bookingsFromTeam.reduce((userIds: number[], booking) => {
        if (typeof booking.userId === "number" && !userIds.includes(booking.userId)) {
          userIds.push(booking.userId);
        }
        return userIds;
      }, []);

      if (userIds.length === 0) {
        return [];
      }
      const usersFromTeam = await ctx.insightsDb.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: userSelect,
      });

      const userHashMap = buildHashMapForUsers(usersFromTeam);

      const result = bookingsFromTeam.map((booking) => ({
        userId: booking.userId,
        // We know with 100% certainty that userHashMap.get(...) will retrieve a user
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        user: userHashMap.get(booking.userId)!,
        emailMd5: md5(user?.email),
        averageRating: booking._avg.rating,
      }));

      return result;
    }),
  membersWithLowestRatings: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.coerce.number().nullable().optional(),
        startDate: z.string(),
        endDate: z.string(),
        eventTypeId: z.coerce.number().optional(),
        isAll: z.boolean().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const bookingWhere: Prisma.BookingTimeStatusWhereInput = {
        teamId,
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
        rating: { not: null },
      };

      if (isAll && user.isOwnerAdminOfParentTeam) {
        delete bookingWhere.teamId;
        const teamsFromOrg = await ctx.insightsDb.team.findMany({
          where: {
            parentId: user?.organizationId,
          },
          select: {
            id: true,
          },
        });
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
            accepted: true,
          },
          select: {
            userId: true,
          },
        });

        bookingWhere["OR"] = [
          {
            teamId: {
              in: teamsFromOrg.map((t) => t.id),
            },
          },
          {
            userId: {
              in: usersFromTeam.map((u) => u.userId),
            },
            teamId: null,
          },
        ];
      }

      if (teamId && !isAll) {
        const usersFromTeam = await ctx.insightsDb.membership.findMany({
          where: {
            teamId,
            accepted: true,
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
      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatus.groupBy({
        by: ["userId"],
        where: bookingWhere,
        _avg: {
          rating: true,
        },
        orderBy: {
          _avg: {
            rating: "asc",
          },
        },
        take: 10,
      });

      const userIds = bookingsFromTeam.reduce((userIds: number[], booking) => {
        if (typeof booking.userId === "number" && !userIds.includes(booking.userId)) {
          userIds.push(booking.userId);
        }
        return userIds;
      }, []);

      if (userIds.length === 0) {
        return [];
      }
      const usersFromTeam = await ctx.insightsDb.user.findMany({
        where: {
          id: {
            in: userIds,
          },
        },
        select: userSelect,
      });

      const userHashMap = buildHashMapForUsers(usersFromTeam);

      const result = bookingsFromTeam.map((booking) => ({
        userId: booking.userId,
        // We know with 100% certainty that userHashMap.get(...) will retrieve a user
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        user: userHashMap.get(booking.userId)!,
        emailMd5: md5(user?.email),
        averageRating: booking._avg.rating,
      }));

      return result;
    }),
  rawData: userBelongsToTeamProcedure.input(rawDataInputSchema).query(async ({ ctx, input }) => {
    const { startDate, endDate, teamId, userId, memberUserId, isAll, eventTypeId } = input;

    const isOrgAdminOrOwner = ctx.user.isOwnerAdminOfParentTeam;
    try {
      // Get the data
      const csvData = await EventsInsights.getCsvData({
        startDate,
        endDate,
        teamId,
        userId,
        memberUserId,
        isAll,
        isOrgAdminOrOwner,
        eventTypeId,
        organizationId: ctx.user.organizationId || null,
      });

      const csvAsString = EventsInsights.objectToCsv(csvData);
      const downloadAs = `Insights-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(endDate).format(
        "YYYY-MM-DD"
      )}-${randomString(10)}.csv`;

      return { data: csvAsString, filename: downloadAs };
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
    return { data: "", filename: "" };
  }),
});
