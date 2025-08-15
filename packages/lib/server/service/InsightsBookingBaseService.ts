import { Prisma } from "@prisma/client";
import md5 from "md5";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { ZColumnFilter } from "@calcom/features/data-table/lib/types";
import type { ColumnFilter } from "@calcom/features/data-table/lib/types";
import { isSingleSelectFilterValue, isMultiSelectFilterValue } from "@calcom/features/data-table/lib/utils";
import type { DateRange } from "@calcom/features/insights/server/insightsDateUtils";
import type { readonlyPrisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../repository/membership";
import { TeamRepository } from "../repository/team";

// Utility function to build user hash map with avatar URL fallback
export const buildHashMapForUsers = <
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

// Type definition for BookingTimeStatusDenormalized view
export type BookingTimeStatusDenormalized = z.infer<typeof bookingDataSchema>;

// Helper type for select parameter
export type BookingSelect = {
  [K in keyof BookingTimeStatusDenormalized]?: boolean;
};

// Helper type for selected fields
export type SelectedFields<T> = T extends undefined
  ? BookingTimeStatusDenormalized
  : {
      [K in keyof T as T[K] extends true ? K : never]: K extends keyof BookingTimeStatusDenormalized
        ? BookingTimeStatusDenormalized[K]
        : never;
    };

type UserStatsData = {
  userId: number;
  user: {
    id: number;
    username: string | null;
    name: string | null;
    email: string;
    avatarUrl: string;
  };
  emailMd5: string;
  count: number;
}[];

export const bookingDataSchema = z
  .object({
    id: z.number(),
    uid: z.string(),
    eventTypeId: z.number().nullable(),
    title: z.string(),
    description: z.string().nullable(),
    startTime: z.date(),
    endTime: z.date(),
    createdAt: z.date(),
    updatedAt: z.date().nullable(),
    location: z.string().nullable(),
    paid: z.boolean(),
    status: z.string(), // BookingStatus enum
    rescheduled: z.boolean().nullable(),
    userId: z.number().nullable(),
    teamId: z.number().nullable(),
    eventLength: z.number().nullable(),
    eventParentId: z.number().nullable(),
    userEmail: z.string().nullable(),
    userName: z.string().nullable(),
    userUsername: z.string().nullable(),
    ratingFeedback: z.string().nullable(),
    rating: z.number().nullable(),
    noShowHost: z.boolean().nullable(),
    isTeamBooking: z.boolean(),
    timeStatus: z.string().nullable(),
  })
  .strict();

export const insightsBookingServiceOptionsSchema = z.discriminatedUnion("scope", [
  z.object({
    scope: z.literal("user"),
    userId: z.number(),
    orgId: z.number(),
  }),
  z.object({
    scope: z.literal("org"),
    userId: z.number(),
    orgId: z.number(),
  }),
  z.object({
    scope: z.literal("team"),
    userId: z.number(),
    orgId: z.number(),
    teamId: z.number(),
  }),
]);

export type InsightsBookingServicePublicOptions = {
  scope: "user" | "org" | "team";
  userId: number;
  orgId: number;
  teamId?: number;
};

export type InsightsBookingServiceOptions = z.infer<typeof insightsBookingServiceOptionsSchema>;

export type InsightsBookingServiceFilterOptions = z.infer<typeof insightsBookingServiceFilterOptionsSchema>;

export const insightsBookingServiceFilterOptionsSchema = z.object({
  dateRange: z
    .object({
      target: z.enum(["createdAt", "startTime"]),
      startDate: z.string(),
      endDate: z.string(),
    })
    .optional(),
  columnFilters: z.array(ZColumnFilter).optional(),
});

const NOTHING_CONDITION = Prisma.sql`1=0`;

const bookingDataKeys = new Set(Object.keys(bookingDataSchema.shape));

export class InsightsBookingBaseService {
  private prisma: typeof readonlyPrisma;
  private options: InsightsBookingServiceOptions | null;
  private filters: InsightsBookingServiceFilterOptions | null;
  private cachedAuthConditions?: Prisma.Sql;
  private cachedFilterConditions?: Prisma.Sql | null;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: typeof readonlyPrisma;
    options: InsightsBookingServicePublicOptions;
    filters?: InsightsBookingServiceFilterOptions;
  }) {
    this.prisma = prisma;
    const optionsValidated = insightsBookingServiceOptionsSchema.safeParse(options);
    this.options = optionsValidated.success ? optionsValidated.data : null;

    const filtersValidated = insightsBookingServiceFilterOptionsSchema.safeParse(filters);
    this.filters = filtersValidated.success ? filtersValidated.data : null;
  }

  async getBookingsByHourStats({ timeZone }: { timeZone: string }) {
    const baseConditions = await this.getBaseConditions();

    const results = await this.prisma.$queryRaw<
      Array<{
        hour: string;
        count: number;
      }>
    >`
      SELECT
        EXTRACT(HOUR FROM ("startTime" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}))::int as "hour",
        COUNT(*)::int as "count"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
        AND "status" = 'accepted'
      GROUP BY 1
      ORDER BY 1
    `;

    // Create a map of results by hour for easy lookup
    const resultsMap = new Map(results.map((row) => [Number(row.hour), row.count]));

    // Return all 24 hours (0-23), filling with 0 values for missing data
    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: resultsMap.get(hour) || 0,
    }));
  }

  async findAll<TSelect extends BookingSelect | undefined = undefined>({
    select,
  }: {
    select?: TSelect;
  } = {}): Promise<Array<SelectedFields<TSelect>>> {
    const baseConditions = await this.getBaseConditions();

    // Build the select clause with validated fields
    let selectFields = Prisma.sql`*`;
    if (select) {
      const keys = Object.keys(select);
      if (keys.some((key) => !bookingDataKeys.has(key))) {
        throw new Error("Invalid select keys provided");
      }

      if (keys.length > 0) {
        // Use Prisma.sql for each field to ensure proper escaping
        const sqlFields = keys.map((field) => Prisma.sql`"${Prisma.raw(field)}"`);
        selectFields = Prisma.join(sqlFields, ", ");
      }
    }

    return await this.prisma.$queryRaw<Array<SelectedFields<TSelect>>>`
      SELECT ${selectFields}
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;
  }

  async getBaseConditions(): Promise<Prisma.Sql> {
    const authConditions = await this.getAuthorizationConditions();
    const filterConditions = await this.getFilterConditions();

    if (authConditions && filterConditions) {
      return Prisma.sql`((${authConditions}) AND (${filterConditions}))`;
    } else if (authConditions) {
      return Prisma.sql`(${authConditions})`;
    } else if (filterConditions) {
      return Prisma.sql`(${filterConditions})`;
    } else {
      return NOTHING_CONDITION;
    }
  }

  async getAuthorizationConditions(): Promise<Prisma.Sql> {
    if (this.cachedAuthConditions === undefined) {
      this.cachedAuthConditions = await this.buildAuthorizationConditions();
    }
    return this.cachedAuthConditions;
  }

  async getFilterConditions(): Promise<Prisma.Sql | null> {
    if (this.cachedFilterConditions === undefined) {
      this.cachedFilterConditions = await this.buildFilterConditions();
    }
    return this.cachedFilterConditions;
  }

  async buildFilterConditions(): Promise<Prisma.Sql | null> {
    const conditions: Prisma.Sql[] = [];

    if (!this.filters) {
      return null;
    }

    // Process columnFilters using type-safe utility functions
    if (this.filters.columnFilters) {
      for (const filter of this.filters.columnFilters) {
        const condition = this.buildColumnFilterCondition(filter);
        if (condition) {
          conditions.push(condition);
        }
      }
    }

    // Use dateRange object for date filtering
    if (this.filters.dateRange) {
      const { target, startDate, endDate } = this.filters.dateRange;
      if (startDate) {
        if (isNaN(Date.parse(startDate))) {
          throw new Error(`Invalid date format: ${startDate}`);
        }
        conditions.push(Prisma.sql`"${Prisma.raw(target)}" >= ${startDate}::timestamp`);
      }
      if (endDate) {
        if (isNaN(Date.parse(endDate))) {
          throw new Error(`Invalid date format: ${endDate}`);
        }
        conditions.push(Prisma.sql`"${Prisma.raw(target)}" <= ${endDate}::timestamp`);
      }
    }

    if (conditions.length === 0) {
      return null;
    }

    // Join all conditions with AND
    return conditions.reduce((acc, condition, index) => {
      if (index === 0) return condition;
      return Prisma.sql`(${acc}) AND (${condition})`;
    });
  }

  private buildColumnFilterCondition(filter: ColumnFilter): Prisma.Sql | null {
    const { id, value } = filter;

    if (!value) {
      return null;
    }

    if (id === "eventTypeId" && isSingleSelectFilterValue(value) && typeof value.data === "number") {
      return Prisma.sql`("eventTypeId" = ${value.data}) OR ("eventParentId" = ${value.data})`;
    }

    if (id === "userId" && isSingleSelectFilterValue(value) && typeof value.data === "number") {
      return Prisma.sql`"userId" = ${value.data}`;
    }

    if (id === "status" && isMultiSelectFilterValue(value)) {
      const statusValues = value.data.map((status) => Prisma.sql`${status}::"BookingStatus"`);
      return Prisma.sql`"status" IN (${Prisma.join(statusValues)})`;
    }

    return null;
  }

  async buildAuthorizationConditions(): Promise<Prisma.Sql> {
    if (!this.options) {
      return NOTHING_CONDITION;
    }
    const scope = this.options.scope;
    const targetId =
      scope === "org" ? this.options.orgId : scope === "team" ? this.options.teamId : undefined;

    if (targetId && scope !== "user") {
      const isOwnerOrAdmin = await this.isOwnerOrAdmin(this.options.userId, targetId);
      if (!isOwnerOrAdmin) {
        return NOTHING_CONDITION;
      }
    }

    if (scope === "user") {
      return Prisma.sql`("userId" = ${this.options.userId}) AND ("teamId" IS NULL)`;
    } else if (scope === "org") {
      return await this.buildOrgAuthorizationCondition(this.options);
    } else if (scope === "team") {
      return await this.buildTeamAuthorizationCondition(this.options);
    } else {
      return NOTHING_CONDITION;
    }
  }

  private async buildOrgAuthorizationCondition(
    options: Extract<InsightsBookingServiceOptions, { scope: "org" }>
  ): Promise<Prisma.Sql> {
    // Get all teams from the organization
    const teamRepo = new TeamRepository(this.prisma);
    const teamsFromOrg = await teamRepo.findAllByParentId({
      parentId: options.orgId,
      select: { id: true },
    });
    const teamIds = [options.orgId, ...teamsFromOrg.map((t) => t.id)];

    // Get all users from the organization
    const userIdsFromOrg =
      teamsFromOrg.length > 0
        ? (await MembershipRepository.findAllByTeamIds({ teamIds, select: { userId: true } })).map(
            (m) => m.userId
          )
        : [];

    const conditions: Prisma.Sql[] = [Prisma.sql`("teamId" = ANY(${teamIds})) AND ("isTeamBooking" = true)`];

    if (userIdsFromOrg.length > 0) {
      const uniqueUserIds = Array.from(new Set(userIdsFromOrg));
      conditions.push(Prisma.sql`("userId" = ANY(${uniqueUserIds})) AND ("isTeamBooking" = false)`);
    }

    return conditions.reduce((acc, condition, index) => {
      if (index === 0) return condition;
      return Prisma.sql`(${acc}) OR (${condition})`;
    });
  }

  private async buildTeamAuthorizationCondition(
    options: Extract<InsightsBookingServiceOptions, { scope: "team" }>
  ): Promise<Prisma.Sql> {
    const teamRepo = new TeamRepository(this.prisma);
    const childTeamOfOrg = await teamRepo.findByIdAndParentId({
      id: options.teamId,
      parentId: options.orgId,
      select: { id: true },
    });
    if (options.orgId && !childTeamOfOrg) {
      return NOTHING_CONDITION;
    }

    const usersFromTeam = await MembershipRepository.findAllByTeamIds({
      teamIds: [options.teamId],
      select: { userId: true },
    });
    const userIdsFromTeam = usersFromTeam.map((u) => u.userId);

    const conditions: Prisma.Sql[] = [
      Prisma.sql`("teamId" = ${options.teamId}) AND ("isTeamBooking" = true)`,
    ];

    if (userIdsFromTeam.length > 0) {
      conditions.push(Prisma.sql`("userId" = ANY(${userIdsFromTeam})) AND ("isTeamBooking" = false)`);
    }

    return conditions.reduce((acc, condition, index) => {
      if (index === 0) return condition;
      return Prisma.sql`(${acc}) OR (${condition})`;
    });
  }

  async getCsvData({ limit = 100, offset = 0 }: { limit?: number; offset?: number }) {
    const baseConditions = await this.getBaseConditions();

    // Get total count first
    const totalCountResult = await this.prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;
    const totalCount = totalCountResult[0]?.count || 0;

    // 1. Get booking data from BookingTimeStatusDenormalized
    const csvData = await this.prisma.$queryRaw<
      Array<{
        id: number;
        uid: string | null;
        title: string;
        createdAt: Date;
        timeStatus: string;
        eventTypeId: number | null;
        eventLength: number;
        startTime: Date;
        endTime: Date;
        paid: boolean;
        userEmail: string;
        userUsername: string;
        rating: number | null;
        ratingFeedback: string | null;
        noShowHost: boolean;
      }>
    >`
      SELECT
        "id",
        "uid",
        "title",
        "createdAt",
        "timeStatus",
        "eventTypeId",
        "eventLength",
        "startTime",
        "endTime",
        "paid",
        "userEmail",
        "userUsername",
        "rating",
        "ratingFeedback",
        "noShowHost"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
      ORDER BY "createdAt" DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    if (csvData.length === 0) {
      return { data: csvData, total: totalCount };
    }

    const uids = csvData.filter((b) => b.uid !== null).map((b) => b.uid as string);

    if (uids.length === 0) {
      return { data: csvData, total: totalCount };
    }

    // 2. Get all bookings with their attendees and seat references
    const bookings = await this.prisma.booking.findMany({
      where: {
        uid: {
          in: uids,
        },
      },
      select: {
        uid: true,
        attendees: {
          select: {
            name: true,
            email: true,
            noShow: true,
          },
        },
        seatsReferences: {
          select: {
            attendee: {
              select: {
                name: true,
                email: true,
                noShow: true,
              },
            },
          },
        },
      },
    });

    // 3. Create booking map with attendee data (matching original logic)
    const bookingMap = new Map(
      bookings.map((booking) => {
        const attendeeList =
          booking.seatsReferences.length > 0
            ? booking.seatsReferences.map((ref) => ref.attendee)
            : booking.attendees;

        // List all no-show guests (name and email)
        const noShowGuests =
          attendeeList
            .filter((attendee) => attendee?.noShow)
            .map((attendee) => (attendee ? `${attendee.name} (${attendee.email})` : null))
            .filter(Boolean) // remove null values
            .join("; ") || null;
        const noShowGuestsCount = attendeeList.filter((attendee) => attendee?.noShow).length;

        const formattedAttendees = attendeeList
          .map((attendee) => (attendee ? `${attendee.name} (${attendee.email})` : null))
          .filter(Boolean);

        return [booking.uid, { attendeeList: formattedAttendees, noShowGuests, noShowGuestsCount }];
      })
    );

    // 4. Calculate max attendees for dynamic columns
    const maxAttendees = Math.max(
      ...Array.from(bookingMap.values()).map((data) => data.attendeeList.length),
      0
    );

    // 5. Create final booking map with attendee fields
    const finalBookingMap = new Map(
      Array.from(bookingMap.entries()).map(([uid, data]) => {
        const attendeeFields: Record<string, string | null> = {};

        for (let i = 1; i <= maxAttendees; i++) {
          attendeeFields[`attendee${i}`] = data.attendeeList[i - 1] || null;
        }

        return [
          uid,
          {
            noShowGuests: data.noShowGuests,
            noShowGuestsCount: data.noShowGuestsCount,
            ...attendeeFields,
          },
        ];
      })
    );

    // 6. Combine booking data with attendee data
    const data = csvData.map((bookingTimeStatus) => {
      if (!bookingTimeStatus.uid) {
        // should not be reached because we filtered above
        const nullAttendeeFields: Record<string, null> = {};
        for (let i = 1; i <= maxAttendees; i++) {
          nullAttendeeFields[`attendee${i}`] = null;
        }

        return {
          ...bookingTimeStatus,
          noShowGuests: null,
          noShowGuestsCount: 0,
          ...nullAttendeeFields,
        };
      }

      const attendeeData = finalBookingMap.get(bookingTimeStatus.uid);

      if (!attendeeData) {
        const nullAttendeeFields: Record<string, null> = {};
        for (let i = 1; i <= maxAttendees; i++) {
          nullAttendeeFields[`attendee${i}`] = null;
        }

        return {
          ...bookingTimeStatus,
          noShowGuests: null,
          noShowGuestsCount: 0,
          ...nullAttendeeFields,
        };
      }

      return {
        ...bookingTimeStatus,
        noShowGuests: attendeeData.noShowGuests,
        noShowGuestsCount: attendeeData.noShowGuestsCount,
        ...Object.fromEntries(Object.entries(attendeeData).filter(([key]) => key.startsWith("attendee"))),
      };
    });

    return { data, total: totalCount };
  }

  async getEventTrendsStats({ timeZone, dateRanges }: { timeZone: string; dateRanges: DateRange[] }) {
    if (!dateRanges.length) {
      return [];
    }

    const baseConditions = await this.getBaseConditions();

    const data = await this.prisma.$queryRaw<
      {
        date: Date;
        bookingsCount: number;
        timeStatus: string;
        noShowHost: boolean;
        noShowGuests: number;
      }[]
    >`
    SELECT
      "date",
      CAST(COUNT(*) AS INTEGER) AS "bookingsCount",
      CAST(COUNT(CASE WHEN "isNoShowGuest" = true THEN 1 END) AS INTEGER) AS "noShowGuests",
      "timeStatus",
      "noShowHost"
    FROM (
      SELECT
        DATE("createdAt" AT TIME ZONE ${timeZone}) as "date",
        "a"."noShow" AS "isNoShowGuest",
        "timeStatus",
        "noShowHost"
      FROM
        "BookingTimeStatusDenormalized"
      JOIN
        "Attendee" "a" ON "a"."bookingId" = "BookingTimeStatusDenormalized"."id"
      WHERE
        ${baseConditions}
    ) AS bookings
    GROUP BY
      "date",
      "timeStatus",
      "noShowHost"
    ORDER BY
      "date"
  `;

    // Initialize aggregate object with zero counts for all date ranges
    const aggregate: {
      [date: string]: {
        completed: number;
        rescheduled: number;
        cancelled: number;
        noShowHost: number;
        noShowGuests: number;
        _all: number;
        uncompleted: number;
      };
    } = {};

    dateRanges.forEach(({ formattedDate }) => {
      aggregate[formattedDate] = {
        completed: 0,
        rescheduled: 0,
        cancelled: 0,
        noShowHost: 0,
        noShowGuests: 0,
        _all: 0,
        uncompleted: 0,
      };
    });

    // Process the raw data and aggregate by date ranges
    data.forEach(({ date, bookingsCount, timeStatus, noShowHost, noShowGuests }) => {
      // Find which date range this date belongs to using native Date comparison
      const dateRange = dateRanges.find((range) => {
        const bookingDate = new Date(date);
        const rangeStart = new Date(range.startDate);
        const rangeEnd = new Date(range.endDate);
        return bookingDate >= rangeStart && bookingDate <= rangeEnd;
      });

      if (!dateRange) return;

      const formattedDate = dateRange.formattedDate;
      const statusKey = timeStatus as keyof (typeof aggregate)[string];

      // Add to the specific status count
      if (statusKey in aggregate[formattedDate]) {
        aggregate[formattedDate][statusKey] += Number(bookingsCount);
      }

      // Add to the total count (_all)
      aggregate[formattedDate]["_all"] += Number(bookingsCount);

      // Track no-show host counts separately
      if (noShowHost) {
        aggregate[formattedDate]["noShowHost"] += Number(bookingsCount);
      }

      // Track no-show guests explicitly
      aggregate[formattedDate]["noShowGuests"] += noShowGuests;
    });

    // Transform aggregate data into the expected format
    const result = dateRanges.map(({ formattedDate, formattedDateFull }) => {
      const eventData = {
        formattedDateFull: formattedDateFull,
        Month: formattedDate,
        Created: 0,
        Completed: 0,
        Rescheduled: 0,
        Cancelled: 0,
        "No-Show (Host)": 0,
        "No-Show (Guest)": 0,
      };

      const countsForDateRange = aggregate[formattedDate];

      if (countsForDateRange) {
        eventData["Created"] = countsForDateRange["_all"] || 0;
        eventData["Completed"] = countsForDateRange["completed"] || 0;
        eventData["Rescheduled"] = countsForDateRange["rescheduled"] || 0;
        eventData["Cancelled"] = countsForDateRange["cancelled"] || 0;
        eventData["No-Show (Host)"] = countsForDateRange["noShowHost"] || 0;
        eventData["No-Show (Guest)"] = countsForDateRange["noShowGuests"] || 0;
      }
      return eventData;
    });

    return result;
  }

  async getPopularEventsStats() {
    const baseConditions = await this.getBaseConditions();

    const bookingsFromSelected = await this.prisma.$queryRaw<
      Array<{
        eventTypeId: number;
        count: number;
      }>
    >`
      SELECT
        "eventTypeId",
        COUNT(id)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "eventTypeId" IS NOT NULL
      GROUP BY "eventTypeId"
      ORDER BY count DESC
      LIMIT 10
    `;

    const eventTypeIds = bookingsFromSelected.map((booking) => booking.eventTypeId);

    if (eventTypeIds.length === 0) {
      return [];
    }

    const eventTypesFrom = await this.prisma.eventType.findMany({
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
      where: {
        id: {
          in: eventTypeIds,
        },
      },
    });

    const eventTypeHashMap = new Map(eventTypesFrom.map((eventType) => [eventType.id, eventType]));

    const result = bookingsFromSelected
      .map((booking) => {
        const eventTypeSelected = eventTypeHashMap.get(booking.eventTypeId);
        if (!eventTypeSelected) {
          return null;
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
          count: booking.count,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return result;
  }

  async getMembersStatsWithCount(
    type: "all" | "cancelled" | "noShow" = "all",
    sortOrder: "ASC" | "DESC" = "DESC"
  ): Promise<UserStatsData> {
    const baseConditions = await this.getBaseConditions();

    let additionalCondition = Prisma.sql``;
    if (type === "cancelled") {
      additionalCondition = Prisma.sql`AND status = 'cancelled'`;
    } else if (type === "noShow") {
      additionalCondition = Prisma.sql`AND "noShowHost" = true`;
    }

    const bookingsFromTeam = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        count: number;
      }>
    >`
      SELECT
        "userId",
        COUNT(id)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "userId" IS NOT NULL ${additionalCondition}
      GROUP BY "userId"
      ORDER BY count ${sortOrder === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
      LIMIT 10
    `;

    if (bookingsFromTeam.length === 0) {
      return [];
    }

    const userIds = bookingsFromTeam.map((booking) => booking.userId);

    const usersFromTeam = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userHashMap = buildHashMapForUsers(usersFromTeam);

    const result = bookingsFromTeam
      .map((booking) => {
        const user = userHashMap.get(booking.userId);
        if (!user) {
          return null;
        }

        return {
          userId: booking.userId,
          user,
          emailMd5: md5(user.email || ""),
          count: booking.count,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return result;
  }

  async getMembersRatingStats(sortOrder: "ASC" | "DESC" = "DESC"): Promise<UserStatsData> {
    const baseConditions = await this.getBaseConditions();

    const bookingsFromTeam = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        count: number;
      }>
    >`
      SELECT
        "userId",
        AVG("rating")::float as "count"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "userId" IS NOT NULL AND "rating" IS NOT NULL
      GROUP BY "userId"
      ORDER BY "count" ${sortOrder === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
      LIMIT 10
    `;

    if (bookingsFromTeam.length === 0) {
      return [];
    }

    const userIds = bookingsFromTeam.map((booking) => booking.userId);

    const usersFromTeam = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userHashMap = buildHashMapForUsers(usersFromTeam);

    const result = bookingsFromTeam
      .map((booking) => {
        const user = userHashMap.get(booking.userId);
        if (!user) {
          return null;
        }

        return {
          userId: booking.userId,
          user,
          emailMd5: md5(user.email),
          count: booking.count,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return result;
  }

  async getRecentRatingsStats() {
    const baseConditions = await this.getBaseConditions();

    const bookingsFromTeam = await this.prisma.$queryRaw<
      Array<{
        userId: number | null;
        rating: number | null;
        ratingFeedback: string | null;
      }>
    >`
      SELECT
        "userId",
        "rating",
        "ratingFeedback"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "ratingFeedback" IS NOT NULL
      ORDER BY "endTime" DESC
      LIMIT 10
    `;

    if (bookingsFromTeam.length === 0) {
      return [];
    }

    const userIds = bookingsFromTeam
      .filter((booking) => booking.userId !== null)
      .map((booking) => booking.userId as number)
      .filter((userId, index, array) => array.indexOf(userId) === index);

    if (userIds.length === 0) {
      return [];
    }

    const usersFromTeam = await this.prisma.user.findMany({
      where: {
        id: {
          in: userIds,
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
      },
    });

    const userHashMap = buildHashMapForUsers(usersFromTeam);

    const result = bookingsFromTeam
      .map((booking) => {
        if (!booking.userId) {
          return null;
        }

        const user = userHashMap.get(booking.userId);
        if (!user) {
          return null;
        }

        return {
          userId: booking.userId,
          user,
          emailMd5: md5(user.email),
          rating: booking.rating,
          feedback: booking.ratingFeedback,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    return result;
  }

  async getBookingStats() {
    const baseConditions = await this.getBaseConditions();

    const stats = await this.prisma.$queryRaw<
      Array<{
        total_bookings: bigint;
        completed_bookings: bigint;
        rescheduled_bookings: bigint;
        cancelled_bookings: bigint;
        no_show_host_bookings: bigint;
        avg_rating: number | null;
        total_ratings: bigint;
        ratings_above_3: bigint;
        no_show_guests: bigint;
      }>
    >`
      WITH booking_stats AS (
        SELECT
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN "timeStatus" = 'completed' THEN 1 END) as completed_bookings,
          COUNT(CASE WHEN "timeStatus" = 'rescheduled' THEN 1 END) as rescheduled_bookings,
          COUNT(CASE WHEN "timeStatus" = 'cancelled' THEN 1 END) as cancelled_bookings,
          COUNT(CASE WHEN "noShowHost" = true THEN 1 END) as no_show_host_bookings,
          AVG(CASE WHEN "rating" IS NOT NULL THEN "rating" END) as avg_rating,
          COUNT(CASE WHEN "rating" IS NOT NULL THEN 1 END) as total_ratings,
          COUNT(CASE WHEN "rating" > 3 THEN 1 END) as ratings_above_3
        FROM "BookingTimeStatusDenormalized"
        WHERE ${baseConditions}
      ),
      guest_stats AS (
        SELECT COUNT(*) as no_show_guests
        FROM "Attendee" a
        INNER JOIN "BookingTimeStatusDenormalized" b ON a."bookingId" = b.id
        WHERE ${baseConditions} AND a."noShow" = true
      )
      SELECT
        bs.total_bookings,
        bs.completed_bookings,
        bs.rescheduled_bookings,
        bs.cancelled_bookings,
        bs.no_show_host_bookings,
        bs.avg_rating,
        bs.total_ratings,
        bs.ratings_above_3,
        gs.no_show_guests
      FROM booking_stats bs, guest_stats gs
    `;

    const rawStats = stats[0];
    return rawStats
      ? {
          total_bookings: Number(rawStats.total_bookings),
          completed_bookings: Number(rawStats.completed_bookings),
          rescheduled_bookings: Number(rawStats.rescheduled_bookings),
          cancelled_bookings: Number(rawStats.cancelled_bookings),
          no_show_host_bookings: Number(rawStats.no_show_host_bookings),
          avg_rating: rawStats.avg_rating,
          total_ratings: Number(rawStats.total_ratings),
          ratings_above_3: Number(rawStats.ratings_above_3),
          no_show_guests: Number(rawStats.no_show_guests),
        }
      : {
          total_bookings: 0,
          completed_bookings: 0,
          rescheduled_bookings: 0,
          cancelled_bookings: 0,
          no_show_host_bookings: 0,
          avg_rating: 0,
          total_ratings: 0,
          ratings_above_3: 0,
          no_show_guests: 0,
        };
  }

  calculatePreviousPeriodDates() {
    if (!this.filters?.dateRange) {
      throw new Error("Date range is required for calculating previous period");
    }

    const startDate = dayjs(this.filters.dateRange.startDate);
    const endDate = dayjs(this.filters.dateRange.endDate);
    const startTimeEndTimeDiff = endDate.diff(startDate, "day");

    const lastPeriodStartDate = startDate.subtract(startTimeEndTimeDiff, "day");
    const lastPeriodEndDate = endDate.subtract(startTimeEndTimeDiff, "day");

    return {
      startDate: lastPeriodStartDate.toISOString(),
      endDate: lastPeriodEndDate.toISOString(),
      formattedStartDate: lastPeriodStartDate.format("YYYY-MM-DD"),
      formattedEndDate: lastPeriodEndDate.format("YYYY-MM-DD"),
    };
  }

  private async isOwnerOrAdmin(userId: number, targetId: number): Promise<boolean> {
    // Check if the user is an owner or admin of the organization or team
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId: targetId });
    return Boolean(
      membership &&
        membership.accepted &&
        membership.role &&
        (membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN)
    );
  }

  private async isOwner(userId: number, targetId: number): Promise<boolean> {
    // Check if the user is an owner of the organization or team
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId: targetId });
    return Boolean(
      membership && membership.accepted && membership.role && membership.role === MembershipRole.OWNER
    );
  }

  private async getUserTeamRole(userId: number, teamId: number): Promise<MembershipRole | null> {
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId });
    return membership?.accepted ? membership.role : null;
  }

  private async buildOOOAuthorizationConditions(): Promise<Prisma.Sql> {
    if (!this.options || this.options.scope !== "team" || !this.options.teamId) {
      return NOTHING_CONDITION;
    }

    const userRole = await this.getUserTeamRole(this.options.userId, this.options.teamId);

    if (!userRole) {
      return NOTHING_CONDITION;
    }

    if (userRole === MembershipRole.OWNER) {
      const usersFromTeam = await MembershipRepository.findAllByTeamIds({
        teamIds: [this.options.teamId],
        select: { userId: true },
      });
      const userIdsFromTeam = usersFromTeam.map((u) => u.userId);
      return userIdsFromTeam.length > 0
        ? Prisma.sql`ooo."userId" = ANY(${userIdsFromTeam})`
        : NOTHING_CONDITION;
    }

    return Prisma.sql`ooo."userId" = ${this.options.userId}`;
  }

  async getOutOfOfficeTrends() {
    const oooAuthConditions = await this.buildOOOAuthorizationConditions();

    const data = await this.prisma.$queryRaw<
      Array<{
        Month: string;
        formattedDateFull: string;
        Vacation: number;
        Sick: number;
        Personal: number;
        Meeting: number;
        Other: number;
      }>
    >`
      SELECT
        TO_CHAR(DATE_TRUNC('month', ooo."start"), 'Mon YYYY') as "Month",
        TO_CHAR(DATE_TRUNC('month', ooo."start"), 'Month YYYY') as "formattedDateFull",
        COUNT(CASE WHEN r.reason ILIKE '%vacation%' THEN 1 END)::int as "Vacation",
        COUNT(CASE WHEN r.reason ILIKE '%sick%' THEN 1 END)::int as "Sick", 
        COUNT(CASE WHEN r.reason ILIKE '%personal%' THEN 1 END)::int as "Personal",
        COUNT(CASE WHEN r.reason ILIKE '%meeting%' THEN 1 END)::int as "Meeting",
        COUNT(CASE WHEN r.reason NOT ILIKE '%vacation%' AND r.reason NOT ILIKE '%sick%' AND r.reason NOT ILIKE '%personal%' AND r.reason NOT ILIKE '%meeting%' THEN 1 END)::int as "Other"
      FROM "OutOfOfficeEntry" ooo
      LEFT JOIN "OutOfOfficeReason" r ON ooo."reasonId" = r.id
      LEFT JOIN "User" u ON ooo."userId" = u.id
      WHERE ${oooAuthConditions}
        AND ooo."start" >= ${this.filters?.dateRange?.startDate || "1900-01-01"}::timestamp
        AND ooo."start" <= ${this.filters?.dateRange?.endDate || "2100-01-01"}::timestamp
      GROUP BY DATE_TRUNC('month', ooo."start")
      ORDER BY DATE_TRUNC('month', ooo."start") ASC
    `;

    return data;
  }

  async getMostOutOfOfficeTeamMembers() {
    const oooAuthConditions = await this.buildOOOAuthorizationConditions();

    const data = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        name: string | null;
        username: string | null;
        email: string;
        emailMd5: string;
        count: number;
      }>
    >`
      SELECT
        u.id as "userId",
        u.name,
        u.username,
        u.email,
        u."emailMd5",
        COUNT(ooo.id)::int as "count"
      FROM "OutOfOfficeEntry" ooo
      LEFT JOIN "User" u ON ooo."userId" = u.id
      WHERE ${oooAuthConditions}
        AND ooo."start" >= ${this.filters?.dateRange?.startDate || "1900-01-01"}::timestamp
        AND ooo."start" <= ${this.filters?.dateRange?.endDate || "2100-01-01"}::timestamp
      GROUP BY u.id, u.name, u.username, u.email, u."emailMd5"
      ORDER BY COUNT(ooo.id) DESC
      LIMIT 10
    `;

    return data.map((row) => ({
      userId: row.userId,
      user: {
        id: row.userId,
        username: row.username,
        name: row.name,
        email: row.email,
        avatarUrl: `/${row.username}/avatar.png`,
      },
      emailMd5: row.emailMd5,
      count: row.count,
    }));
  }

  async getLeastOutOfOfficeTeamMembers() {
    const oooAuthConditions = await this.buildOOOAuthorizationConditions();

    const data = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        name: string | null;
        username: string | null;
        email: string;
        emailMd5: string;
        count: number;
      }>
    >`
      SELECT
        u.id as "userId",
        u.name,
        u.username,
        u.email,
        u."emailMd5",
        COUNT(ooo.id)::int as "count"
      FROM "OutOfOfficeEntry" ooo
      LEFT JOIN "User" u ON ooo."userId" = u.id
      WHERE ${oooAuthConditions}
        AND ooo."start" >= ${this.filters?.dateRange?.startDate || "1900-01-01"}::timestamp
        AND ooo."start" <= ${this.filters?.dateRange?.endDate || "2100-01-01"}::timestamp
      GROUP BY u.id, u.name, u.username, u.email, u."emailMd5"
      ORDER BY COUNT(ooo.id) ASC
      LIMIT 10
    `;

    return data.map((row) => ({
      userId: row.userId,
      user: {
        id: row.userId,
        username: row.username,
        name: row.name,
        email: row.email,
        avatarUrl: `/${row.username}/avatar.png`,
      },
      emailMd5: row.emailMd5,
      count: row.count,
    }));
  }
}
