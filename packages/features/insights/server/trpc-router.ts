import type { Prisma } from "@prisma/client";
import md5 from "md5";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import {
  rawDataInputSchema,
  routingFormResponsesInputSchema,
  routingFormStatsInputSchema,
  routingRepositoryBaseInputSchema,
  bookingRepositoryBaseInputSchema,
} from "@calcom/features/insights/server/raw-data.schema";
import { getInsightsRoutingService } from "@calcom/lib/di/containers/insights-routing";
import { InsightsBookingService } from "@calcom/lib/server/service/insightsBooking";
import type { readonlyPrisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { EventsInsights, type GetDateRangesParams } from "./events";
import { RoutingEventsInsights } from "./routing-events";
import { VirtualQueuesInsights } from "./virtual-queues";

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

export const buildBaseWhereCondition = async ({
  teamId,
  eventTypeId,
  memberUserId,
  userId,
  isAll,
  ctx,
}: BuildBaseWhereConditionType): Promise<{
  whereCondition: Prisma.BookingTimeStatusDenormalizedWhereInput;
}> => {
  const conditions: Prisma.BookingTimeStatusDenormalizedWhereInput[] = [];

  // EventType Filter
  if (eventTypeId) {
    conditions.push({
      OR: [{ eventTypeId }, { eventParentId: eventTypeId }],
    });
  }

  // User/Member filter
  if (memberUserId) {
    conditions.push({ userId: memberUserId });
  }

  if (userId) {
    conditions.push({
      teamId: null,
      userId: userId,
    });
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

    const teamIds = [ctx.userOrganizationId, ...teamsFromOrg.map((t) => t.id)];
    const usersFromOrg =
      teamsFromOrg.length > 0
        ? await ctx.insightsDb.membership.findMany({
            where: {
              team: {
                id: {
                  in: teamIds,
                },
              },
              accepted: true,
            },
            select: {
              userId: true,
            },
          })
        : [];

    conditions.push({
      OR: [
        {
          teamId: {
            in: teamIds,
          },
          isTeamBooking: true,
        },
        ...(usersFromOrg.length > 0
          ? [
              {
                userId: {
                  in: usersFromOrg.map((u) => u.userId),
                },
                isTeamBooking: false,
              },
            ]
          : []),
      ],
    });
  }

  // Team-specific queries condition
  if (!isAll && teamId) {
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

    conditions.push({
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
    });
  }

  let whereCondition: Prisma.BookingTimeStatusDenormalizedWhereInput = {};

  if (conditions.length === 1) {
    whereCondition = conditions[0];
  } else if (conditions.length > 1) {
    whereCondition = { AND: conditions };
  }

  return {
    whereCondition:
      Object.keys(whereCondition).length === 0
        ? { id: -1 } // Ensure no data is returned for invalid parameters
        : whereCondition,
  };
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
    if (!membership && ctx.user.organizationId && parse.data.teamId) {
      const isChildTeamOfOrg = await ctx.insightsDb.team.findFirst({
        where: {
          id: parse.data.teamId,
          parentId: ctx.user.organizationId,
        },
      });
      if (!isChildTeamOfOrg) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
    }

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

/**
 * Helper function to create InsightsBookingService with standardized parameters
 */
function createInsightsBookingService(
  ctx: { insightsDb: typeof readonlyPrisma; user: { id: number; organizationId: number | null } },
  input: z.infer<typeof bookingRepositoryBaseInputSchema>,
  dateTarget: "createdAt" | "startTime" = "createdAt"
) {
  const { scope, selectedTeamId, eventTypeId, memberUserId, startDate, endDate } = input;

  return new InsightsBookingService({
    prisma: ctx.insightsDb,
    options: {
      scope,
      userId: ctx.user.id,
      orgId: ctx.user.organizationId ?? 0,
      ...(selectedTeamId && { teamId: selectedTeamId }),
    },
    filters: {
      ...(eventTypeId && { eventTypeId }),
      ...(memberUserId && { memberUserId }),
      dateRange: {
        target: dateTarget,
        startDate,
        endDate,
      },
    },
  });
}
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
        gte: startDate,
        lte: endDate,
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
  eventTrends: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, timeZone } = input;

      // Calculate timeView and dateRanges
      const timeView = EventsInsights.getTimeView(startDate, endDate);
      const dateRanges = EventsInsights.getDateRanges({
        startDate,
        endDate,
        timeView,
        timeZone,
        weekStart: ctx.user.weekStart,
      });

      const insightsBookingService = createInsightsBookingService(ctx, input);
      try {
        return await insightsBookingService.getEventTrendsStats({
          timeZone,
          dateRanges,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
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
        gte: startDate,
        lte: endDate,
      },
    };

    const bookingsFromSelected = await ctx.insightsDb.bookingTimeStatusDenormalized.groupBy({
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
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, timeZone } = input;

      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        const timeView = EventsInsights.getTimeView(startDate, endDate);
        const dateRanges = EventsInsights.getDateRanges({
          startDate,
          endDate,
          timeView,
          timeZone,
          weekStart: ctx.user.weekStart as GetDateRangesParams["weekStart"],
        });

        if (!dateRanges.length) {
          return [];
        }

        const startOfEndOf = timeView === "year" ? "year" : timeView === "month" ? "month" : "week";

        const allBookings = await insightsBookingService.findAll({
          select: {
            eventLength: true,
            createdAt: true,
          },
        });

        const resultMap = new Map<string, { totalDuration: number; count: number }>();

        // Initialize the map with all date ranges
        for (const range of dateRanges) {
          resultMap.set(dayjs(range.startDate).format("ll"), { totalDuration: 0, count: 0 });
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
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithMostCancelledBookings: userBelongsToTeamProcedure
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
          gte: startDate,
          lte: endDate,
        },
        status: "CANCELLED",
      };

      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatusDenormalized.groupBy({
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
          gte: startDate,
          lte: endDate,
        },
      };

      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatusDenormalized.groupBy({
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
          gte: startDate,
          lte: endDate,
        },
      };

      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatusDenormalized.groupBy({
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

    // Validate if user belongs to org as admin/owner
    if (user.organizationId && user.organization.isOrgAdmin) {
      const teamsAndOrg = await ctx.insightsDb.team.findMany({
        where: {
          OR: [{ parentId: user.organizationId }, { id: user.organizationId }],
        },
        select: {
          id: true,
          slug: true,
          name: true,
          logoUrl: true,
        },
      });
      const teamsFromOrg = teamsAndOrg.filter((team) => team.id !== user.organizationId);
      const orgTeam = teamsAndOrg.find((team) => team.id === user.organizationId);
      if (!orgTeam) {
        return [];
      }

      const result: IResultTeamList[] = [
        {
          ...orgTeam,
          isOrg: true,
        },
        ...teamsFromOrg,
      ];

      return result;
    }

    // Look if user it's admin/owner in multiple teams
    const belongsToTeams = await ctx.insightsDb.membership.findMany({
      where: {
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
      },
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
  userList: authedProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
        isAll: z.boolean().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = ctx.user;
      const { teamId, isAll } = input;

      if (isAll && user.organizationId && user.organization.isOrgAdmin) {
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

      if (!teamId) {
        return [];
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

      const eventTypeList = await getEventTypeList({
        prisma,
        teamId,
        userId,
        isAll,
        user: {
          id: user.id,
          organizationId: user.organizationId,
          isOwnerAdminOfParentTeam: user.isOwnerAdminOfParentTeam,
        },
      });

      return eventTypeList;
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
      createdAt: {
        gte: startDate,
        lte: endDate,
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

    const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatusDenormalized.findMany({
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
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        noShowHost: true,
      };

      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatusDenormalized.groupBy({
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
        ...bookingWhere,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        rating: { not: null },
      };

      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatusDenormalized.groupBy({
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
        ...bookingWhere,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        rating: { not: null },
      };

      const bookingsFromTeam = await ctx.insightsDb.bookingTimeStatusDenormalized.groupBy({
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
  rawData: userBelongsToTeamProcedure
    .input(
      bookingRepositoryBaseInputSchema.extend({
        limit: z.number().max(100).optional(),
        offset: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset } = input;

      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getCsvData({
          limit: limit ?? 100,
          offset: offset ?? 0,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  getRoutingFormsForFilters: userBelongsToTeamProcedure
    .input(z.object({ userId: z.number().optional(), teamId: z.number().optional(), isAll: z.boolean() }))
    .query(async ({ ctx, input }) => {
      const { userId, teamId, isAll } = input;
      return await RoutingEventsInsights.getRoutingFormsForFilters({
        userId: ctx.user.id,
        teamId,
        isAll,
        organizationId: ctx.user.organizationId ?? undefined,
      });
    }),
  routingFormsByStatus: userBelongsToTeamProcedure
    .input(routingFormStatsInputSchema)
    .query(async ({ ctx, input }) => {
      return await RoutingEventsInsights.getRoutingFormStats({
        teamId: input.teamId,
        startDate: input.startDate,
        endDate: input.endDate,
        isAll: input.isAll,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: input.routingFormId,
        userId: ctx.user.id,
        memberUserIds: input.memberUserIds,
        columnFilters: input.columnFilters,
        sorting: input.sorting,
      });
    }),
  routingFormResponses: userBelongsToTeamProcedure
    .input(routingFormResponsesInputSchema)
    .query(async ({ ctx, input }) => {
      return await RoutingEventsInsights.getRoutingFormPaginatedResponses({
        teamId: input.teamId,
        startDate: input.startDate,
        endDate: input.endDate,
        isAll: input.isAll,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: input.routingFormId,
        userId: ctx.user.id,
        memberUserIds: input.memberUserIds,
        limit: input.limit,
        offset: input.offset,
        columnFilters: input.columnFilters,
        sorting: input.sorting,
      });
    }),
  routingFormResponsesForDownload: userBelongsToTeamProcedure
    .input(routingFormResponsesInputSchema)
    .query(async ({ ctx, input }) => {
      return await RoutingEventsInsights.getRoutingFormPaginatedResponsesForDownload({
        teamId: input.teamId,
        startDate: input.startDate,
        endDate: input.endDate,
        isAll: input.isAll,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: input.routingFormId,
        userId: ctx.user.id,
        memberUserIds: input.memberUserIds,
        limit: input.limit ?? BATCH_SIZE,
        offset: input.offset,
        columnFilters: input.columnFilters,
        sorting: input.sorting,
      });
    }),
  getRoutingFormFieldOptions: userBelongsToTeamProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        isAll: z.boolean(),
        routingFormId: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const options = await RoutingEventsInsights.getRoutingFormFieldOptions({
        ...input,
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId ?? null,
      });
      return options;
    }),
  failedBookingsByField: userBelongsToTeamProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        isAll: z.boolean(),
        routingFormId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await RoutingEventsInsights.getFailedBookingsByRoutingFormGroup({
        ...input,
        userId: ctx.user.id,
        organizationId: ctx.user.organizationId ?? null,
      });
    }),
  routingFormResponsesHeaders: userBelongsToTeamProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        isAll: z.boolean(),
        routingFormId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const headers = await RoutingEventsInsights.getRoutingFormHeaders({
        userId: ctx.user.id,
        teamId: input.teamId ?? null,
        isAll: input.isAll,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: input.routingFormId ?? null,
      });

      return headers || [];
    }),
  routedToPerPeriod: userBelongsToTeamProcedure
    .input(
      rawDataInputSchema.extend({
        period: z.enum(["perDay", "perWeek", "perMonth"]),
        cursor: z
          .object({
            userCursor: z.number().optional(),
            periodCursor: z.string().optional(),
          })
          .optional(),
        routingFormId: z.string().optional(),
        limit: z.number().optional(),
        searchQuery: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { teamId, userId, startDate, endDate, period, cursor, limit, isAll, routingFormId, searchQuery } =
        input;

      return await RoutingEventsInsights.routedToPerPeriod({
        userId: ctx.user.id,
        teamId: teamId ?? null,
        startDate,
        endDate,
        period,
        cursor: cursor?.periodCursor,
        userCursor: cursor?.userCursor,
        limit,
        isAll: isAll ?? false,
        organizationId: ctx.user.organizationId ?? null,
        routingFormId: routingFormId ?? null,
        searchQuery: searchQuery,
      });
    }),
  routedToPerPeriodCsv: userBelongsToTeamProcedure
    .input(
      rawDataInputSchema.extend({
        period: z.enum(["perDay", "perWeek", "perMonth"]),
        searchQuery: z.string().optional(),
        routingFormId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;
      try {
        const csvData = await RoutingEventsInsights.routedToPerPeriodCsv({
          userId: ctx.user.id,
          teamId: input.teamId ?? null,
          startDate,
          endDate,
          isAll: input.isAll ?? false,
          organizationId: ctx.user.organizationId ?? null,
          routingFormId: input.routingFormId ?? null,
          period: input.period,
          searchQuery: input.searchQuery,
        });

        const csvString = RoutingEventsInsights.objectToCsv(csvData);
        const downloadAs = `routed-to-${input.period}-${dayjs(startDate).format("YYYY-MM-DD")}-${dayjs(
          endDate
        ).format("YYYY-MM-DD")}.csv`;

        return { data: csvString, filename: downloadAs };
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  getUserRelevantTeamRoutingForms: authedProcedure.query(async ({ ctx }) => {
    try {
      const routingForms = await VirtualQueuesInsights.getUserRelevantTeamRoutingForms({
        userId: ctx.user.id,
      });

      return routingForms;
    } catch (e) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
  }),
  getRoutingFunnelData: userBelongsToTeamProcedure
    .input(routingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const timeView = EventsInsights.getTimeView(input.startDate, input.endDate);
      const dateRanges = EventsInsights.getDateRanges({
        startDate: input.startDate,
        endDate: input.endDate,
        timeZone: ctx.user.timeZone,
        timeView,
        weekStart: ctx.user.weekStart,
      });
      const insightsRoutingService = getInsightsRoutingService({
        options: {
          scope: input.scope,
          teamId: input.selectedTeamId,
          userId: ctx.user.id,
          orgId: ctx.user.organizationId,
        },
        filters: {
          startDate: input.startDate,
          endDate: input.endDate,
          columnFilters: input.columnFilters,
        },
      });
      try {
        return await insightsRoutingService.getRoutingFunnelData(dateRanges);
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  bookingsByHourStats: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { timeZone } = input;
      const insightsBookingService = createInsightsBookingService(ctx, input, "startTime");

      try {
        return await insightsBookingService.getBookingsByHourStats({
          timeZone,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
});

async function getEventTypeList({
  prisma,
  teamId,
  userId,
  isAll,
  user,
}: {
  prisma: typeof readonlyPrisma;
  teamId: number | null | undefined;
  userId: number | null | undefined;
  isAll: boolean | undefined;
  user: {
    id: number;
    organizationId: number | null;
    isOwnerAdminOfParentTeam: boolean;
  };
}) {
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
}
