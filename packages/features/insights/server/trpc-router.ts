import {
  CalIdWorkflowEventsInsights,
  parseUtcTimestamp,
} from "@calid/features/modules/insights/server/workflow-events";
import type { CalIdMembership, Prisma } from "@prisma/client";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import {
  rawDataInputSchema,
  routingFormResponsesInputSchema,
  routingFormStatsInputSchema,
  routingRepositoryBaseInputSchema,
  bookingRepositoryBaseInputSchema,
  workflowRepositoryBaseInputSchema,
} from "@calcom/features/insights/server/raw-data.schema";
import { getInsightsRoutingService } from "@calcom/lib/di/containers/insights-routing";
import { InsightsBookingService } from "@calcom/lib/server/service/insightsBooking";
import type { readonlyPrisma } from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { WorkflowMethods, WorkflowStatus } from "@calcom/prisma/enums";
import authedProcedure from "@calcom/trpc/server/procedures/authedProcedure";
import { router } from "@calcom/trpc/server/trpc";

import { TRPCError } from "@trpc/server";

import { getTimeView, getDateRanges, type GetDateRangesParams } from "./insightsDateUtils";
import { RoutingEventsInsights } from "./routing-events";
import { VirtualQueuesInsights } from "./virtual-queues";

const UserBelongsToTeamInput = z.object({
  teamId: z.coerce.number().optional().nullable(),
  isAll: z.boolean().optional(),
});
const WorkflowMethodsSchema = z.nativeEnum(WorkflowMethods);

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

  // // organization-wide queries condition
  // if (isAll && ctx.userIsOwnerAdminOfParentTeam && ctx.userOrganizationId) {
  //   const teamsFromOrg = await ctx.insightsDb.team.findMany({
  //     where: {
  //       parentId: ctx.userOrganizationId,
  //     },
  //     select: {
  //       id: true,
  //     },
  //   });

  //   const teamIds = [ctx.userOrganizationId, ...teamsFromOrg.map((t) => t.id)];
  //   const usersFromOrg =
  //     teamsFromOrg.length > 0
  //       ? await ctx.insightsDb.membership.findMany({
  //           where: {
  //             team: {
  //               id: {
  //                 in: teamIds,
  //               },
  //             },
  //             accepted: true,
  //           },
  //           select: {
  //             userId: true,
  //           },
  //         })
  //       : [];

  //   conditions.push({
  //     OR: [
  //       {
  //         teamId: {
  //           in: teamIds,
  //         },
  //         isTeamBooking: true,
  //       },
  //       ...(usersFromOrg.length > 0
  //         ? [
  //             {
  //               userId: {
  //                 in: usersFromOrg.map((u) => u.userId),
  //               },
  //               isTeamBooking: false,
  //             },
  //           ]
  //         : []),
  //     ],
  //   });
  // }

  // Team-specific queries condition
  if (!isAll && teamId) {
    // const usersFromTeam = await ctx.insightsDb.calIdMembership.findMany({
    //   where: {
    //     calIdTeamId: teamId,
    //     acceptedInvitation: true,
    //   },
    //   select: {
    //     userId: true,
    //   },
    // });
    // const userIdsFromTeam = usersFromTeam.map((u) => u.userId);

    // conditions.push({
    // OR: [
    // {
    // calIdTeamId: teamId,
    // isTeamBooking: true,
    // },
    // {
    //   userId: {
    //     in: userIdsFromTeam,
    //   },
    //   isTeamBooking: false,
    // },
    // ],
    // });

    // Get all event types belonging to this team
    const teamEventTypes = await ctx.insightsDb.eventType.findMany({
      where: {
        calIdTeamId: teamId,
      },
      select: {
        id: true,
      },
    });

    const eventTypeIds = teamEventTypes.map((et) => et.id);

    if (eventTypeIds.length > 0) {
      conditions.push({
        OR: [
          {
            eventTypeId: {
              in: eventTypeIds,
            },
          },
          {
            eventParentId: {
              in: eventTypeIds,
            },
          },
        ],
      });
    } else {
      // No event types found for this team, return no results
      conditions.push({
        id: -1,
      });
    }
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

  const { teamId, isAll } = parse.data;

  // Case 1: specific team provided
  if (teamId && !isAll) {
    const membership = await ctx.insightsDb.calIdMembership.findFirst({
      where: {
        calIdTeamId: teamId,
        userId: ctx.user.id,
        acceptedInvitation: true,
      },
    });

    if (!membership) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
  }

  // Case 2: isAll=true and no specific team -> user must belong to at least one team
  if (isAll && !teamId) {
    const memberships = await ctx.insightsDb.calIdMembership.findMany({
      where: {
        userId: ctx.user.id,
        acceptedInvitation: true,
      },
      select: { calIdTeamId: true },
    });

    if (memberships.length === 0) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    // // you could attach teamIds to ctx if you want downstream resolvers to use them
    // ctx.user.teamIds = memberships.map((m) => m.calIdTeamId);
  }

  // Case 3: isAll=true and teamId provided -> skip membership check,

  if (isAll && teamId) {
    // optionally allow OR enforce membership validation here
  }

  return next({
    ctx: {
      user: {
        ...ctx.user,
        // isOwnerAdminOfParentTeam: false, // enable later if needed
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

const emptyResponseBookingKPIStats = {
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
  bookingKPIStats: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const currentPeriodService = createInsightsBookingService(ctx, input);

      // Get current period stats
      const currentStats = await currentPeriodService.getBookingStats();

      // Calculate previous period dates and create service for previous period
      const previousPeriodDates = currentPeriodService.calculatePreviousPeriodDates();
      const previousPeriodService = createInsightsBookingService(ctx, {
        ...input,
        startDate: previousPeriodDates.startDate,
        endDate: previousPeriodDates.endDate,
      });

      // Get previous period stats
      const previousStats = await previousPeriodService.getBookingStats();

      // Helper function to calculate percentage change
      const getPercentage = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous) * 100;
      };

      // Calculate percentages and CSAT
      const currentCSAT =
        currentStats.total_ratings > 0
          ? (currentStats.ratings_above_3 / currentStats.total_ratings) * 100
          : 0;
      const previousCSAT =
        previousStats.total_ratings > 0
          ? (previousStats.ratings_above_3 / previousStats.total_ratings) * 100
          : 0;

      const currentRating = currentStats.avg_rating ? parseFloat(currentStats.avg_rating.toFixed(1)) : 0;
      const previousRating = previousStats.avg_rating ? parseFloat(previousStats.avg_rating.toFixed(1)) : 0;

      // Check if all metrics are zero for empty state
      const isEmpty =
        currentStats.total_bookings === 0 &&
        currentStats.completed_bookings === 0 &&
        currentStats.rescheduled_bookings === 0 &&
        currentStats.cancelled_bookings === 0 &&
        currentStats.no_show_host_bookings === 0 &&
        currentStats.no_show_guests === 0 &&
        currentRating === 0;

      if (isEmpty) {
        return emptyResponseBookingKPIStats;
      }

      return {
        empty: false,
        created: {
          count: currentStats.total_bookings,
          deltaPrevious: getPercentage(currentStats.total_bookings, previousStats.total_bookings),
        },
        completed: {
          count: currentStats.completed_bookings,
          deltaPrevious: getPercentage(
            currentStats.total_bookings - currentStats.cancelled_bookings - currentStats.rescheduled_bookings,
            previousStats.total_bookings -
              previousStats.cancelled_bookings -
              previousStats.rescheduled_bookings
          ),
        },
        rescheduled: {
          count: currentStats.rescheduled_bookings,
          deltaPrevious: getPercentage(currentStats.rescheduled_bookings, previousStats.rescheduled_bookings),
        },
        cancelled: {
          count: currentStats.cancelled_bookings,
          deltaPrevious: getPercentage(currentStats.cancelled_bookings, previousStats.cancelled_bookings),
        },
        no_show: {
          count: currentStats.no_show_host_bookings,
          deltaPrevious: getPercentage(
            currentStats.no_show_host_bookings,
            previousStats.no_show_host_bookings
          ),
        },
        no_show_guest: {
          count: currentStats.no_show_guests,
          deltaPrevious: getPercentage(currentStats.no_show_guests, previousStats.no_show_guests),
        },
        rating: {
          count: currentRating,
          deltaPrevious: getPercentage(currentRating, previousRating),
        },
        csat: {
          count: currentCSAT,
          deltaPrevious: getPercentage(currentCSAT, previousCSAT),
        },
        previousRange: {
          startDate: previousPeriodDates.formattedStartDate,
          endDate: previousPeriodDates.formattedEndDate,
        },
      };
    }),
  eventTrends: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, timeZone } = input;

      // Calculate timeView and dateRanges
      const timeView = getTimeView(startDate, endDate);
      const dateRanges = getDateRanges({
        startDate,
        endDate,
        timeView,
        timeZone: timeZone === "Asia/Calcutta" ? "Asia/Kolkata" : timeZone,
        weekStart: ctx.user.weekStart,
      });

      const insightsBookingService = createInsightsBookingService(ctx, input);
      try {
        return await insightsBookingService.getEventTrendsStats({
          timeZone: timeZone === "Asia/Calcutta" ? "Asia/Kolkata" : timeZone,
          dateRanges,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  popularEvents: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getPopularEventsStats();
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  averageEventDuration: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, timeZone } = input;

      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        const timeView = getTimeView(startDate, endDate);
        const dateRanges = getDateRanges({
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
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount("cancelled", "DESC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithMostBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount("all", "DESC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithLeastBookings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount("all", "ASC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
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

    // // Validate if user belongs to org as admin/owner
    // if (user.organizationId && user.organization.isOrgAdmin) {
    //   const teamsAndOrg = await ctx.insightsDb.team.findMany({
    //     where: {
    //       OR: [{ parentId: user.organizationId }, { id: user.organizationId }],
    //     },
    //     select: {
    //       id: true,
    //       slug: true,
    //       name: true,
    //       logoUrl: true,
    //     },
    //   });
    //   const teamsFromOrg = teamsAndOrg.filter((team) => team.id !== user.organizationId);
    //   const orgTeam = teamsAndOrg.find((team) => team.id === user.organizationId);
    //   if (!orgTeam) {
    //     return [];
    //   }

    //   const result: IResultTeamList[] = [
    //     {
    //       ...orgTeam,
    //       isOrg: true,
    //     },
    //     ...teamsFromOrg,
    //   ];

    //   return result;
    // }

    // Look if user it's admin/owner in multiple teams
    const belongsToTeams = await ctx.insightsDb.calIdMembership.findMany({
      where: {
        calIdTeam: {
          slug: { not: null },
        },
        acceptedInvitation: true,
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
        calIdTeam: {
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
      return { ...membership.calIdTeam };
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

      // if (isAll && user.organizationId && user.organization.isOrgAdmin) {
      //   const usersInTeam = await ctx.insightsDb.membership.findMany({
      //     where: {
      //       team: {
      //         parentId: user.organizationId,
      //       },
      //     },
      //     include: {
      //       user: {
      //         select: userSelect,
      //       },
      //     },
      //     distinct: ["userId"],
      //   });
      //   return usersInTeam.map((membership) => membership.user);
      // }

      if (!teamId) {
        return [];
      }

      const membership = await ctx.insightsDb.calIdMembership.findFirst({
        where: {
          userId: user.id,
          calIdTeamId: teamId,
          acceptedInvitation: true,
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

      const usersInTeam = await ctx.insightsDb.calIdMembership.findMany({
        where: {
          calIdTeamId: teamId,
          acceptedInvitation: true,
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
          // isOwnerAdminOfParentTeam: user.isOwnerAdminOfParentTeam,
          isOwnerAdminOfParentTeam: false,
        },
      });

      return eventTypeList;
    }),
  recentRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getRecentRatingsStats();
    }),
  membersWithMostNoShow: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ input, ctx }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);

      try {
        return await insightsBookingService.getMembersStatsWithCount("noShow", "DESC");
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),
  membersWithHighestRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getMembersRatingStats("DESC");
    }),
  membersWithLowestRatings: userBelongsToTeamProcedure
    .input(bookingRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const insightsBookingService = createInsightsBookingService(ctx, input);
      return await insightsBookingService.getMembersRatingStats("ASC");
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
      const timeView = getTimeView(input.startDate, input.endDate);
      const dateRanges = getDateRanges({
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
          timeZone: timeZone === "Asia/Calcutta" ? "Asia/Kolkata" : timeZone,
        });
      } catch (e) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  workflowsByStatus: userBelongsToTeamProcedure
    .input(
      rawDataInputSchema.extend({
        type: WorkflowMethodsSchema.optional().nullable(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, eventTypeId, memberUserId: userId, selectedTeamId: teamId, type } = input;

      const stats: {
        deliveredCount: number;
        readCount: number;
        failedCount: number;
        queuedCount: number;
        cancelledCount: number;
        total: number;
      } = {
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
        queuedCount: 0,
        cancelledCount: 0,
        total: 0,
      };

      // Build date range conditions
      const dateConditions = [
        startDate
          ? {
              createdAt: {
                gte: dayjs.utc(startDate).startOf("day").toDate(),
              },
            }
          : null,
        endDate
          ? {
              createdAt: {
                lte: dayjs.utc(endDate).endOf("day").toDate(),
              },
            }
          : null,
      ].filter(Boolean) as Prisma.CalIdWorkflowInsightsWhereInput[];

      // Get eventTypeIds based on user or team
      const eventTypeIds: number[] = [];
      if (userId) {
        const _eventTypeIds = (
          await ctx.insightsDb.eventType.findMany({
            where: { userId },
            select: { id: true },
          })
        ).map(({ id }) => id);
        eventTypeIds.push(..._eventTypeIds);
      }
      if (teamId) {
        const _eventTypeIds = (
          await ctx.insightsDb.eventType.findMany({
            where: { calIdTeamId: teamId },
            select: { id: true },
          })
        ).map(({ id }) => id);
        eventTypeIds.push(..._eventTypeIds);
      }

      // Build where conditions for insights
      const insightsWhereConditions = [
        ...dateConditions,
        eventTypeId ? { eventTypeId } : { eventTypeId: { in: eventTypeIds } },
        type ? { type } : null,
        { workflowStepId: { not: null } }, // Mandatory condition
      ].filter(Boolean) as Prisma.CalIdWorkflowInsightsWhereInput[];

      const insightsWhereQuery: Prisma.CalIdWorkflowInsightsWhereInput = insightsWhereConditions.length
        ? { AND: insightsWhereConditions }
        : {};

      // Fetch workflow insights
      const workflowInsights = await ctx.insightsDb.calIdWorkflowInsights.findMany({
        where: insightsWhereQuery,
        select: {
          msgId: true,
          status: true,
          type: true,
          eventTypeId: true,
          workflowStepId: true,
          bookingUid: true,
          bookingSeatReferenceUid: true,
        },
      });

      // Build where conditions for reminders
      const reminderDateConditions = [
        startDate
          ? {
              scheduledDate: {
                gte: dayjs.utc(startDate).startOf("day").toDate(),
              },
            }
          : null,
        endDate
          ? {
              scheduledDate: {
                lte: dayjs.utc(endDate).endOf("day").toDate(),
              },
            }
          : null,
      ].filter(Boolean) as Prisma.CalIdWorkflowReminderWhereInput[];

      // Fetch workflow reminders
      const workflowReminders = await ctx.insightsDb.calIdWorkflowReminder.findMany({
        where: {
          AND: [
            ...reminderDateConditions,
            type ? { method: type } : {},
            {
              booking: eventTypeId ? { eventTypeId } : { eventTypeId: { in: eventTypeIds } },
            },
            { workflowStepId: { not: null } }, // Mandatory condition
          ].filter((condition) => Object.keys(condition).length > 0),
        },
        select: {
          id: true,
          method: true,
          scheduled: true,
          scheduledDate: true,
          cancelled: true,
          workflowStepId: true,
          bookingUid: true,
          seatReferenceId: true,
          booking: {
            select: {
              eventTypeId: true,
            },
          },
        },
      });

      // Create a set of reminder identifiers that have corresponding insights
      const processedReminderKeys = new Set<string>();
      const currentTime = Date.now();

      workflowInsights.forEach((insight) => {
        // Create a key to match reminders with insights
        const reminderKey = `${insight.bookingUid}-${insight.workflowStepId}-${
          insight.bookingSeatReferenceUid || "booking"
        }`;
        processedReminderKeys.add(reminderKey);

        // Count insight statuses
        if (insight.status === WorkflowStatus.DELIVERED || insight.status === WorkflowStatus.SENT) {
          stats.deliveredCount += 1;
        } else if (insight.status === WorkflowStatus.READ) {
          stats.readCount += 1;
        } else if (insight.status === WorkflowStatus.FAILED) {
          stats.failedCount += 1;
        } else if (insight.status === WorkflowStatus.QUEUED) {
          stats.queuedCount += 1;
        } else if (insight.status === WorkflowStatus.CANCELLED) {
          stats.cancelledCount += 1;
        }
      });

      // Process reminders that don't have corresponding insights (these are QUEUED)
      workflowReminders.forEach((reminder) => {
        const reminderKey = `${reminder.bookingUid}-${reminder.workflowStepId}-${
          reminder.seatReferenceId || "booking"
        }`;

        // Skip if this reminder already has a corresponding insight
        if (processedReminderKeys.has(reminderKey)) {
          return;
        }
        const { scheduled, cancelled } = reminder;
        const parsedScheduledDate = parseUtcTimestamp(reminder.scheduledDate);
        if (scheduled && parsedScheduledDate <= currentTime) {
          stats.deliveredCount += 1;
        } else if (cancelled) {
          stats.cancelledCount += 1;
        } else if (scheduled && parsedScheduledDate > currentTime) {
          stats.queuedCount += 1;
        }
      });

      // Total includes both insights and unprocessed reminders
      stats.total =
        workflowInsights.length +
        workflowReminders.filter((reminder) => {
          const reminderKey = `${reminder.bookingUid}-${reminder.workflowStepId}-${
            reminder.seatReferenceId || "booking"
          }`;
          return !processedReminderKeys.has(reminderKey);
        }).length;

      return stats;
    }),

  workflowsTimeline: userBelongsToTeamProcedure
    .input(workflowRepositoryBaseInputSchema)
    .query(async ({ ctx, input }) => {
      const { userId, teamId, eventTypeId, type, startDate, endDate, timeZone } = input;

      // Build where conditions for insights
      const insightsWhereConditions = [
        { createdAt: { gte: startDate } },
        { createdAt: { lte: endDate } },
        eventTypeId ? { eventTypeId } : null,
        type ? { type } : null,
        { workflowStepId: { not: null } }, // Mandatory condition to filter out default booking reminders
      ].filter(Boolean) as Prisma.CalIdWorkflowInsightsWhereInput[];

      const insightsWhereQuery: Prisma.CalIdWorkflowInsightsWhereInput = insightsWhereConditions.length
        ? { AND: insightsWhereConditions }
        : { AND: [] };

      // Build where conditions for reminders
      const remindersWhereConditions = [
        { scheduledDate: { gte: startDate } },
        { scheduledDate: { lte: endDate } },
        type ? { method: type } : null,
        { workflowStepId: { not: null } }, // Mandatory condition
      ].filter(Boolean) as Prisma.CalIdWorkflowReminderWhereInput[];

      const eventTypeIds: number[] = [];
      if (userId) {
        const _eventTypeIds = (
          await ctx.insightsDb.eventType.findMany({
            where: { userId },
            select: { id: true },
          })
        ).map(({ id }) => id);
        eventTypeIds.push(..._eventTypeIds);
      }

      if (teamId) {
        const _eventTypeIds = (
          await ctx.insightsDb.eventType.findMany({
            where: { calIdTeamId: teamId },
            select: { id: true },
          })
        ).map(({ id }) => id);
        eventTypeIds.push(..._eventTypeIds);
      }

      if (!eventTypeId) {
        (insightsWhereQuery.AND as Prisma.CalIdWorkflowInsightsWhereInput[]).push({
          eventTypeId: { in: eventTypeIds },
        });
      }

      const timeView = getTimeView(input.startDate, input.endDate);
      const dateRanges = getDateRanges({
        startDate: input.startDate,
        endDate: input.endDate,
        timeZone: ctx.user.timeZone,
        timeView,
        weekStart: ctx.user.weekStart,
      });

      // Fetch aggregated counts from both insights and reminders
      const countsByStatus = await CalIdWorkflowEventsInsights.countGroupedWorkflowByStatusForRanges(
        insightsWhereQuery,
        remindersWhereConditions,
        dateRanges,
        timeZone,
        eventTypeId,
        eventTypeIds
      );

      const ranges = dateRanges.map(({ startDate, endDate, formattedDate }) => {
        const key = `${startDate}_${endDate}`;
        const stats = countsByStatus[key] || {
          DELIVERED: 0,
          READ: 0,
          FAILED: 0,
          QUEUED: 0,
          CANCELLED: 0,
          _all: 0,
        };

        return {
          startDate,
          endDate,
          formattedDate: formattedDate,
          Delivered: stats.DELIVERED,
          Read: stats.READ,
          Failed: stats.FAILED,
          Queued: stats.QUEUED,
          Cancelled: stats.CANCELLED,
          Total: stats._all,
        };
      });

      return ranges;
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
  // Must have at least teamId or userId or isAll=true
  if (!teamId && !userId && !isAll) {
    return [];
  }

  let membership: CalIdMembership | null = null;
  let teamIds: number[] = [];

  // Case 1: specific team (with membership check)
  if (teamId && !isAll) {
    membership = await prisma.calIdMembership.findFirst({
      where: {
        calIdTeamId: teamId,
        userId: user.id,
      },
    });

    if (!membership) {
      throw new Error("User is not part of this team");
    }

    teamIds = [teamId];
  }

  // Case 2: isAll=true and no specific team -> collect all teams where user is member
  if (isAll && !teamId) {
    const memberships = await prisma.calIdMembership.findMany({
      where: { userId: user.id },
      select: { calIdTeamId: true, role: true },
    });

    teamIds = memberships.map((m) => m.calIdTeamId);

    if (teamIds.length === 0) {
      return [];
    }

    // Optional: if you want to know the user's role in these teams,
    // you can keep the memberships array for role-based restrictions
  }

  // Case 3: isAll=true and teamId provided -> skip membership check, just use teamId
  if (isAll && teamId) {
    teamIds = [teamId];
  }

  // Build event type filter
  const eventTypeWhere: Prisma.EventTypeWhereInput = {};

  if (teamIds.length > 0) {
    eventTypeWhere.calIdTeamId = { in: teamIds };
  }

  if (userId) {
    eventTypeWhere.userId = userId;
  }

  // Restrict results if the user is only a MEMBER (only applies in Case 1)
  const isMemberOnly = membership?.role === "MEMBER" && !user.isOwnerAdminOfParentTeam;

  if (isMemberOnly) {
    eventTypeWhere.OR = [{ userId: user.id }, { users: { some: { id: user.id } } }];
  }

  // Final query
  const eventTypes = await prisma.eventType.findMany({
    select: {
      id: true,
      slug: true,
      title: true,
      calIdTeamId: true,
      calIdTeam: {
        select: { name: true },
      },
    },
    where: eventTypeWhere,
  });

  return eventTypes;
}
