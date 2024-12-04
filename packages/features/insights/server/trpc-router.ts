import type { Prisma } from "@prisma/client";
import md5 from "md5";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { rawDataInputSchema } from "@calcom/features/insights/server/raw-data.schema";
import { randomString } from "@calcom/lib/random";
import type { readonlyPrisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { EventsInsights } from "./events";
import { RoutingEventsInsights } from "./routing-events";

const UserBelongsToTeamInput = z.object({
  teamId: z.coerce.number().optional().nullable(),
  isAll: z.boolean().optional(),
});

type BuildBaseWhereConditionCtxType = {
  userIsOwnerAdminOfParentTeam: boolean;
  userOrganizationId: number | null;
  insightsDb: typeof readonlyPrisma;
};

interface BuildBaseWhereConditionType {
  teamId?: number | null;
  eventTypeId?: number;
  memberUserId?: number;
  userId?: number;
  isAll?: boolean;
  ctx: BuildBaseWhereConditionCtxType;
}

const bookingStatusSchema = z.enum(["NO_BOOKING", ...Object.values(BookingStatus)]).optional();

const buildBaseWhereCondition = async ({
  teamId,
  eventTypeId,
  memberUserId,
  userId,
  isAll,
  ctx,
}: BuildBaseWhereConditionType): Promise<{
  whereCondition: Prisma.BookingTimeStatusWhereInput;
  isEmptyResponse?: boolean;
}> => {
  let whereCondition: Prisma.BookingTimeStatusWhereInput = {};
  // EventType Filter
  if (eventTypeId) whereCondition.OR = [{ eventTypeId }, { eventParentId: eventTypeId }];
  // User/Member filter
  if (memberUserId) whereCondition.userId = memberUserId;
  if (userId) {
    whereCondition.teamId = null;
    whereCondition.userId = userId;
  }
  // organization-wide queries condition
  if (isAll && ctx.userIsOwnerAdminOfParentTeam && ctx.userOrganizationId) {
    const teamsFromOrg = await ctx.insightsDb.team.findMany({
      where: {
        parentId: ctx.userOrganizationId,
      },
      select: {
        id: true,
      },
    });
    if (teamsFromOrg.length === 0) return { whereCondition, isEmptyResponse: true };

    const teamConditional = {
      id: {
        in: [ctx.userOrganizationId, ...teamsFromOrg.map((t) => t.id)],
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
    whereCondition = {
      ...whereCondition,
      OR: [
        {
          teamId: {
            in: [ctx.userOrganizationId, ...teamsFromOrg.map((t) => t.id)],
          },
          isTeamBooking: true,
        },
        {
          userId: {
            in: userIdsFromOrg,
          },
          isTeamBooking: false,
        },
      ],
    };
  }

  if (teamId && !isAll && !eventTypeId) {
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
    whereCondition = {
      ...whereCondition,
      OR: [
        {
          teamId,
          isTeamBooking: true,
        },
        {
          userId: {
            in: userIdsFromTeam,
          },
          isTeamBooking: false,
        },
      ],
    };
  }
  return { whereCondition };
};

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
  no_show_guest: {
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

const BATCH_SIZE = 1000; // Adjust based on your needs

export const insightsRouter = router({
  eventsByStatus: userBelongsToTeamProcedure.input(rawDataInputSchema).query(async ({ ctx, input }) => {
    const { teamId, startDate, endDate, eventTypeId, memberUserId, userId, isAll } = input;
    if (userId && userId !== ctx.user.id) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    const r = await buildBaseWhereCondition({
      teamId,
      eventTypeId: eventTypeId ?? undefined,
      memberUserId: memberUserId ?? undefined,
      userId: userId ?? undefined,
      isAll: isAll ?? false,
      ctx: {
        userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
        userOrganizationId: ctx.user.organizationId,
        insightsDb: ctx.insightsDb,
      },
    });

    const { whereCondition: whereConditional } = r;

    const baseWhereCondition = {
      ...whereConditional,
      createdAt: {
        gte: dayjs(startDate).startOf("day").toDate(),
        lte: dayjs(endDate).endOf("day").toDate(),
      },
    };

    const startTimeEndTimeDiff = dayjs(endDate).diff(dayjs(startDate), "day");

    const lastPeriodStartDate = dayjs(startDate).subtract(startTimeEndTimeDiff, "day");
    const lastPeriodEndDate = dayjs(endDate).subtract(startTimeEndTimeDiff, "day");

    const lastPeriodBaseCondition = {
      ...whereConditional,
      createdAt: {
        gte: lastPeriodStartDate.toDate(),
        lte: lastPeriodEndDate.toDate(),
      },
    };

    const [
      countGroupedByStatus,
      totalRatingsAggregate,
      totalCSAT,
      totalNoShowGuests,
      lastPeriodCountGroupedByStatus,
      lastPeriodTotalRatingsAggregate,
      lastPeriodTotalCSAT,
      lastPeriodTotalNoShowGuests,
    ] = await Promise.all([
      EventsInsights.countGroupedByStatus(baseWhereCondition),
      EventsInsights.getAverageRating(baseWhereCondition),
      EventsInsights.getTotalCSAT(baseWhereCondition),
      EventsInsights.getTotalNoShowGuests(baseWhereCondition),
      EventsInsights.countGroupedByStatus(lastPeriodBaseCondition),
      EventsInsights.getAverageRating(lastPeriodBaseCondition),
      EventsInsights.getTotalCSAT(lastPeriodBaseCondition),
      EventsInsights.getTotalNoShowGuests(lastPeriodBaseCondition),
    ]);

    const baseBookingsCount = countGroupedByStatus["_all"];
    const totalCompleted = countGroupedByStatus["completed"];
    const totalRescheduled = countGroupedByStatus["rescheduled"];
    const totalCancelled = countGroupedByStatus["cancelled"];
    const totalNoShow = countGroupedByStatus["noShowHost"];

    const averageRating = totalRatingsAggregate._avg.rating
      ? parseFloat(totalRatingsAggregate._avg.rating.toFixed(1))
      : 0;

    const lastPeriodBaseBookingsCount = lastPeriodCountGroupedByStatus["_all"];
    const lastPeriodTotalRescheduled = lastPeriodCountGroupedByStatus["rescheduled"];
    const lastPeriodTotalCancelled = lastPeriodCountGroupedByStatus["cancelled"];
    const lastPeriodTotalNoShow = lastPeriodCountGroupedByStatus["noShowHost"];

    const lastPeriodAverageRating = lastPeriodTotalRatingsAggregate._avg.rating
      ? parseFloat(lastPeriodTotalRatingsAggregate._avg.rating.toFixed(1))
      : 0;

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
      no_show_guest: {
        count: totalNoShowGuests,
        deltaPrevious: EventsInsights.getPercentage(totalNoShowGuests, lastPeriodTotalNoShowGuests),
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
      result.no_show_guest.count === 0 &&
      result.rating.count === 0
    ) {
      return emptyResponseEventsByStatus;
    }

    return result;
  }),
  eventsTimeline: userBelongsToTeamProcedure
    .input(
      rawDataInputSchema.extend({
        timeView: z.enum(["week", "month", "year", "day"]),
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

      // Convert to UTC without shifting the time zone
      let startDate = dayjs.utc(startDateString).startOf("day");
      let endDate = dayjs.utc(endDateString).endOf("day");

      if (selfUserId && ctx.user?.id !== selfUserId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (!teamId && !selfUserId) {
        return [];
      }

      let timeView = inputTimeView;

      // Adjust the timeView if the range is less than 14 days
      if (timeView === "week" && endDate.diff(startDate, "day") < 14) {
        timeView = "day";
      }

      // Align startDate to the Monday of the week if timeView is 'week'
      if (timeView === "week") {
        startDate = startDate.day(1); // Set startDate to Monday
        endDate = endDate.day(1).add(6, "day").endOf("day"); // Set endDate to Sunday of the same week
      }

      const r = await buildBaseWhereCondition({
        teamId,
        eventTypeId: eventTypeId ?? undefined,
        memberUserId: memberUserId ?? undefined,
        userId: selfUserId ?? undefined,
        isAll: isAll ?? false,
        ctx: {
          userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
          userOrganizationId: ctx.user.organizationId,
          insightsDb: ctx.insightsDb,
        },
      });

      const { whereCondition: whereConditional } = r;
      const timeline = await EventsInsights.getTimeLine(timeView, startDate, endDate);

      if (!timeline) {
        return [];
      }

      const dateFormat: string = timeView === "year" ? "YYYY" : timeView === "month" ? "MMM YYYY" : "ll";

      // Align date ranges consistently with weeks starting on Monday
      const dateRanges = timeline.map((date) => {
        let startOfRange = dayjs.utc(date).startOf(timeView);
        let endOfRange = dayjs.utc(date).endOf(timeView);

        if (timeView === "week") {
          startOfRange = dayjs.utc(date).day(1); // Start at Monday in UTC
          endOfRange = startOfRange.add(6, "day").endOf("day"); // End at Sunday in UTC
        }

        return {
          startDate: startOfRange.toISOString(),
          endDate: endOfRange.toISOString(),
          formattedDate: startOfRange.format(dateFormat), // Align formatted date for consistency
        };
      });
      // Fetch counts grouped by status for the entire range
      const countsByStatus = await EventsInsights.countGroupedByStatusForRanges(
        whereConditional,
        startDate,
        endDate,
        timeView
      );
      const result = dateRanges.map(({ formattedDate }) => {
        const EventData = {
          Month: formattedDate,
          Created: 0,
          Completed: 0,
          Rescheduled: 0,
          Cancelled: 0,
          "No-Show (Host)": 0,
          "No-Show (Guest)": 0,
        };

        const countsForDateRange = countsByStatus[formattedDate];

        if (countsForDateRange) {
          EventData["Created"] = countsForDateRange["_all"] || 0;
          EventData["Completed"] = countsForDateRange["completed"] || 0;
          EventData["Rescheduled"] = countsForDateRange["rescheduled"] || 0;
          EventData["Cancelled"] = countsForDateRange["cancelled"] || 0;
          EventData["No-Show (Host)"] = countsForDateRange["noShowHost"] || 0;
          EventData["No-Show (Guest)"] = countsForDateRange["noShowGuests"] || 0;
        }
        return EventData;
      });

      return result;
    }),
  popularEventTypes: userBelongsToTeamProcedure.input(rawDataInputSchema).query(async ({ ctx, input }) => {
    const { teamId, startDate, endDate, memberUserId, userId, isAll, eventTypeId } = input;

    const user = ctx.user;

    if (userId && user?.id !== userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (!teamId && !userId) {
      return [];
    }

    const r = await buildBaseWhereCondition({
      teamId,
      eventTypeId: eventTypeId ?? undefined,
      memberUserId: memberUserId ?? undefined,
      userId: userId ?? undefined,
      isAll: isAll ?? false,
      ctx: {
        userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
        userOrganizationId: ctx.user.organizationId,
        insightsDb: ctx.insightsDb,
      },
    });

    let { whereCondition: bookingWhere } = r;

    bookingWhere = {
      ...bookingWhere,
      createdAt: {
        gte: dayjs(startDate).toISOString(),
        lte: dayjs(endDate).toISOString(),
      },
    };

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
  averageEventDuration: userBelongsToTeamProcedure.input(rawDataInputSchema).query(async ({ ctx, input }) => {
    const {
      teamId,
      startDate: startDateString,
      endDate: endDateString,
      memberUserId,
      userId,
      eventTypeId,
      isAll,
    } = input;

    if (userId && ctx.user?.id !== userId) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    if (!teamId && !userId) {
      return [];
    }

    const startDate = dayjs.utc(startDateString).startOf("day");
    const endDate = dayjs.utc(endDateString).endOf("day");

    const { whereCondition: whereConditional } = await buildBaseWhereCondition({
      teamId,
      eventTypeId: eventTypeId ?? undefined,
      memberUserId: memberUserId ?? undefined,
      userId: userId ?? undefined,
      isAll: isAll ?? false,
      ctx: {
        userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
        userOrganizationId: ctx.user.organizationId,
        insightsDb: ctx.insightsDb,
      },
    });

    const timeView = EventsInsights.getTimeView("week", startDate, endDate);
    const timeLine = await EventsInsights.getTimeLine("week", startDate, endDate);

    if (!timeLine) {
      return [];
    }

    const startOfEndOf = timeView === "year" ? "year" : timeView === "month" ? "month" : "week";

    const allBookings = await ctx.insightsDb.bookingTimeStatus.findMany({
      select: {
        eventLength: true,
        createdAt: true,
      },
      where: {
        ...whereConditional,
        createdAt: {
          gte: startDate.toDate(),
          lte: endDate.toDate(),
        },
      },
    });

    const resultMap = new Map<string, { totalDuration: number; count: number }>();

    for (const date of timeLine) {
      resultMap.set(dayjs(date).startOf(startOfEndOf).format("ll"), { totalDuration: 0, count: 0 });
    }

    for (const booking of allBookings) {
      const periodStart = dayjs(booking.createdAt).startOf(startOfEndOf).format("ll");
      if (resultMap.has(periodStart)) {
        const current = resultMap.get(periodStart)!;
        current.totalDuration += booking.eventLength || 0;
        current.count += 1;
      }
    }

    const result = Array.from(resultMap.entries()).map(([date, { totalDuration, count }]) => ({
      Date: date,
      Average: count > 0 ? totalDuration / count : 0,
    }));

    return result;
  }),
  membersWithMostBookings: userBelongsToTeamProcedure
    .input(rawDataInputSchema)
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll, userId, memberUserId } = input;

      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const r = await buildBaseWhereCondition({
        teamId,
        eventTypeId: eventTypeId ?? undefined,
        memberUserId: memberUserId ?? undefined,
        userId: userId ?? undefined,
        isAll: isAll ?? false,
        ctx: {
          userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
          userOrganizationId: ctx.user.organizationId,
          insightsDb: ctx.insightsDb,
        },
      });

      let { whereCondition: bookingWhere } = r;

      bookingWhere = {
        ...bookingWhere,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };

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
    .input(rawDataInputSchema)
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll, userId, memberUserId } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const r = await buildBaseWhereCondition({
        teamId,
        eventTypeId: eventTypeId ?? undefined,
        memberUserId: memberUserId ?? undefined,
        userId: userId ?? undefined,
        isAll: isAll ?? false,
        ctx: {
          userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
          userOrganizationId: ctx.user.organizationId,
          insightsDb: ctx.insightsDb,
        },
      });

      let { whereCondition: bookingWhere } = r;

      bookingWhere = {
        ...bookingWhere,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
      };

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
        teamId: z.coerce.number().nullish(),
        userId: z.coerce.number().nullish(),
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
  recentRatings: userBelongsToTeamProcedure.input(rawDataInputSchema).query(async ({ ctx, input }) => {
    const { teamId, startDate, endDate, eventTypeId, isAll, userId, memberUserId } = input;
    if (!teamId) {
      return [];
    }
    const user = ctx.user;

    const r = await buildBaseWhereCondition({
      teamId,
      eventTypeId: eventTypeId ?? undefined,
      memberUserId: memberUserId ?? undefined,
      userId: userId ?? undefined,
      isAll: isAll ?? false,
      ctx: {
        userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
        userOrganizationId: ctx.user.organizationId,
        insightsDb: ctx.insightsDb,
      },
    });

    let { whereCondition: bookingWhere } = r;

    bookingWhere = {
      ...bookingWhere,
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
        ...(bookingWhere.OR || []),
        {
          teamId: {
            in: teamsFromOrg.map((t) => t.id),
          },
          isTeamBooking: true,
        },
        {
          userId: {
            in: usersFromTeam.map((u) => u.userId),
          },
          isTeamBooking: false,
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
    .input(rawDataInputSchema)
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll, userId, memberUserId } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;
      const r = await buildBaseWhereCondition({
        teamId,
        eventTypeId: eventTypeId ?? undefined,
        memberUserId: memberUserId ?? undefined,
        userId: userId ?? undefined,
        isAll: isAll ?? false,
        ctx: {
          userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
          userOrganizationId: ctx.user.organizationId,
          insightsDb: ctx.insightsDb,
        },
      });
      let { whereCondition: bookingWhere } = r;

      bookingWhere = {
        ...bookingWhere,
        teamId,
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
        noShowHost: true,
      };

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
    .input(rawDataInputSchema)
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll, memberUserId, userId } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const r = await buildBaseWhereCondition({
        teamId,
        eventTypeId: eventTypeId ?? undefined,
        memberUserId: memberUserId ?? undefined,
        userId: userId ?? undefined,
        isAll: isAll ?? false,
        ctx: {
          userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
          userOrganizationId: ctx.user.organizationId,
          insightsDb: ctx.insightsDb,
        },
      });
      let { whereCondition: bookingWhere } = r;

      bookingWhere = {
        teamId,
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
        rating: { not: null },
      };

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
    .input(rawDataInputSchema)
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, eventTypeId, isAll, memberUserId, userId } = input;
      if (!teamId) {
        return [];
      }
      const user = ctx.user;

      const r = await buildBaseWhereCondition({
        teamId,
        eventTypeId: eventTypeId ?? undefined,
        memberUserId: memberUserId ?? undefined,
        userId: userId ?? undefined,
        isAll: isAll ?? false,
        ctx: {
          userIsOwnerAdminOfParentTeam: ctx.user.isOwnerAdminOfParentTeam,
          userOrganizationId: ctx.user.organizationId,
          insightsDb: ctx.insightsDb,
        },
      });

      let { whereCondition: bookingWhere } = r;
      bookingWhere = {
        teamId,
        eventTypeId,
        createdAt: {
          gte: dayjs(startDate).startOf("day").toDate(),
          lte: dayjs(endDate).endOf("day").toDate(),
        },
        rating: { not: null },
      };

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

  getRoutingFormsForFilters: userBelongsToTeamProcedure
    .input(z.object({ teamId: z.number().optional(), isAll: z.boolean() }))
    .query(async ({ ctx, input }) => {
      const { teamId, isAll } = input;
      return await RoutingEventsInsights.getRoutingFormsForFilters({
        teamId,
        isAll,
        organizationId: ctx.user.organizationId ?? undefined,
      });
    }),
  routingFormsByStatus: userBelongsToTeamProcedure
    .input(
      rawDataInputSchema.extend({
        routingFormId: z.string().optional(),
        bookingStatus: bookingStatusSchema,
        fieldFilter: z
          .object({
            fieldId: z.string(),
            optionId: z.string(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const stats = await RoutingEventsInsights.getRoutingFormStats({
        teamId: input.teamId ?? null,
        startDate,
        endDate,
        isAll: input.isAll ?? false,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: input.routingFormId ?? null,
        userId: input.userId ?? null,
        bookingStatus: input.bookingStatus ?? null,
        fieldFilter: input.fieldFilter ?? null,
      });

      return stats;
    }),
  routingFormResponses: userBelongsToTeamProcedure
    .input(
      rawDataInputSchema.extend({
        routingFormId: z.string().optional(),
        cursor: z.number().optional(),
        limit: z.number().optional(),
        bookingStatus: bookingStatusSchema,
        fieldFilter: z
          .object({
            fieldId: z.string(),
            optionId: z.string(),
          })
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
      return await RoutingEventsInsights.getRoutingFormPaginatedResponses({
        teamId: input.teamId ?? null,
        startDate,
        endDate,
        isAll: input.isAll ?? false,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: input.routingFormId ?? null,
        cursor: input.cursor,
        userId: input.userId ?? null,
        limit: input.limit,
        bookingStatus: input.bookingStatus ?? null,
        fieldFilter: input.fieldFilter ?? null,
      });
    }),
  getRoutingFormFieldOptions: userBelongsToTeamProcedure
    .input(
      z.object({ teamId: z.number().optional(), isAll: z.boolean(), routingFormId: z.string().optional() })
    )
    .query(async ({ input, ctx }) => {
      const options = await RoutingEventsInsights.getRoutingFormFieldOptions({
        ...input,
        organizationId: ctx.user.organizationId ?? null,
      });
      return options;
    }),
  failedBookingsByField: userBelongsToTeamProcedure
    .input(
      z.object({ teamId: z.number().optional(), isAll: z.boolean(), routingFormId: z.string().optional() })
    )
    .query(async ({ ctx, input }) => {
      return await RoutingEventsInsights.getFailedBookingsByRoutingFormGroup({
        ...input,
        organizationId: ctx.user.organizationId ?? null,
      });
    }),
  routingFormResponsesHeaders: userBelongsToTeamProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
        isAll: z.boolean(),
        routingFormId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await RoutingEventsInsights.getRoutingFormHeaders({
        teamId: input.teamId ?? null,
        isAll: input.isAll,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: input.routingFormId ?? null,
      });
    }),
  rawRoutingData: userBelongsToTeamProcedure
    .input(
      rawDataInputSchema.extend({
        routingFormId: z.string().optional(),
        bookingStatus: bookingStatusSchema,
        fieldFilter: z
          .object({
            fieldId: z.string(),
            optionId: z.string(),
          })
          .optional(),
        cursor: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, startDate, endDate, userId, isAll, routingFormId, bookingStatus, fieldFilter, cursor } =
        input;

      if (!teamId && !userId) {
        return { data: [], hasMore: false, nextCursor: null };
      }

      try {
        const csvData = await RoutingEventsInsights.getRawData({
          teamId,
          startDate,
          endDate,
          userId,
          isAll: isAll ?? false,
          organizationId: ctx.user.organizationId,
          routingFormId,
          bookingStatus,
          fieldFilter,
          take: BATCH_SIZE,
          skip: cursor || 0,
        });

        const hasMore = csvData.length === BATCH_SIZE;
        const nextCursor = hasMore ? (cursor || 0) + BATCH_SIZE : null;

        return {
          data: csvData,
          hasMore,
          nextCursor,
        };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});
