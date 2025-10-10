import md5 from "md5";
import { z } from "zod";

import dayjs from "@calcom/dayjs";
import { makeSqlCondition } from "@calcom/features/data-table/lib/server";
import { ZColumnFilter } from "@calcom/features/data-table/lib/types";
import { type ColumnFilter } from "@calcom/features/data-table/lib/types";
import {
  isSingleSelectFilterValue,
  isMultiSelectFilterValue,
  isTextFilterValue,
  isNumberFilterValue,
  isDateRangeFilterValue,
} from "@calcom/features/data-table/lib/utils";
import { extractDateRangeFromColumnFilters } from "@calcom/features/insights/lib/bookingUtils";
import type { DateRange } from "@calcom/features/insights/server/insightsDateUtils";
import { PermissionCheckService } from "@calcom/features/pbac/services/permission-check.service";
import { MembershipRepository } from "@calcom/features/membership/repositories/MembershipRepository";
import { TeamRepository } from "@calcom/lib/server/repository/team";
import type { PrismaClient } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";
import { MembershipRole } from "@calcom/prisma/enums";

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
    orgId: z.number().nullish().optional(),
  }),
  z.object({
    scope: z.literal("org"),
    userId: z.number(),
    orgId: z.number(),
  }),
  z.object({
    scope: z.literal("team"),
    userId: z.number(),
    orgId: z.number().nullish().optional(),
    teamId: z.number(),
  }),
]);

export type InsightsBookingServicePublicOptions = {
  scope: "user" | "org" | "team";
  userId: number;
  orgId: number | null | undefined;
  teamId?: number;
};

export type InsightsBookingServiceOptions = z.infer<typeof insightsBookingServiceOptionsSchema>;

export type InsightsBookingServiceFilterOptions = z.infer<typeof insightsBookingServiceFilterOptionsSchema>;

export const insightsBookingServiceFilterOptionsSchema = z.object({
  columnFilters: z.array(ZColumnFilter).optional(),
});

const NOTHING_CONDITION = Prisma.sql`1=0`;

const bookingDataKeys = new Set(Object.keys(bookingDataSchema.shape));

export class InsightsBookingBaseService {
  private prisma: PrismaClient;
  private options: InsightsBookingServiceOptions | null;
  private filters: InsightsBookingServiceFilterOptions | null;
  private cachedAuthConditions?: Prisma.Sql;
  private cachedFilterConditions?: Prisma.Sql | null;

  constructor({
    prisma,
    options,
    filters,
  }: {
    prisma: PrismaClient;
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

    const query = Prisma.sql`
      SELECT
        EXTRACT(HOUR FROM ("startTime" AT TIME ZONE 'UTC' AT TIME ZONE ${timeZone}))::int as "hour",
        COUNT(*)::int as "count"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
        AND "status" = 'accepted'
      GROUP BY 1
      ORDER BY 1
    `;

    const results = await this.prisma.$queryRaw<
      Array<{
        hour: string;
        count: number;
      }>
    >(query);

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

    const query = Prisma.sql`
      SELECT ${selectFields}
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;

    return await this.prisma.$queryRaw<Array<SelectedFields<TSelect>>>(query);
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

    if (id === "eventTypeId" && isMultiSelectFilterValue(value)) {
      const eventTypeIds = value.data.map((id) => Number(id));

      if (eventTypeIds.length === 0) {
        return null;
      }

      return Prisma.sql`("eventTypeId" IN (${Prisma.join(eventTypeIds)}) OR "eventParentId" IN (${Prisma.join(
        eventTypeIds
      )}))`;
    }

    if (id === "userId" && isSingleSelectFilterValue(value) && typeof value.data === "number") {
      return Prisma.sql`"userId" = ${value.data}`;
    }

    if (id === "status" && isMultiSelectFilterValue(value)) {
      const statusValues = value.data.map((status) => Prisma.sql`${status}::"BookingStatus"`);
      return Prisma.sql`"status" IN (${Prisma.join(statusValues)})`;
    }

    if (id === "paid" && isSingleSelectFilterValue(value)) {
      const paidValue = value.data === "true";
      return Prisma.sql`"paid" = ${paidValue}`;
    }

    if (id === "userEmail" && isTextFilterValue(value)) {
      const condition = makeSqlCondition(value);
      if (condition) {
        return Prisma.sql`"userEmail" ${condition}`;
      }
    }

    if (id === "userName" && isTextFilterValue(value)) {
      const condition = makeSqlCondition(value);
      if (condition) {
        return Prisma.sql`"userName" ${condition}`;
      }
    }

    if (id === "rating" && isNumberFilterValue(value)) {
      const condition = makeSqlCondition(value);
      if (condition) {
        return Prisma.sql`"rating" ${condition}`;
      }
    }

    if ((id === "startTime" || id === "createdAt") && isDateRangeFilterValue(value)) {
      const conditions: Prisma.Sql[] = [];
      // if `startTime` filter -> x <= "startTime" AND "endTime" <= y
      // if `createdAt` filter -> x <= "createdAt" AND "createdAt" <= y
      if (value.data.startDate) {
        if (isNaN(Date.parse(value.data.startDate))) {
          throw new Error(`Invalid date format: ${value.data.startDate}`);
        }
        if (id === "startTime") {
          conditions.push(Prisma.sql`${value.data.startDate}::timestamp <= "startTime"`);
        } else {
          conditions.push(Prisma.sql`${value.data.startDate}::timestamp <= "createdAt"`);
        }
      }
      if (value.data.endDate) {
        if (isNaN(Date.parse(value.data.endDate))) {
          throw new Error(`Invalid date format: ${value.data.endDate}`);
        }
        if (id === "startTime") {
          conditions.push(Prisma.sql`"endTime" <= ${value.data.endDate}::timestamp`);
        } else {
          conditions.push(Prisma.sql`"createdAt" <= ${value.data.endDate}::timestamp`);
        }
      }
      if (conditions.length === 0) {
        return null;
      }
      return conditions.reduce((acc, condition, index) => {
        if (index === 0) return condition;
        return Prisma.sql`(${acc}) AND (${condition})`;
      });
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

    if (options.orgId) {
      // team under org
      const childTeamOfOrg = await teamRepo.findByIdAndParentId({
        id: options.teamId,
        parentId: options.orgId,
        select: { id: true },
      });
      if (!childTeamOfOrg) {
        // teamId and its orgId does not match
        return NOTHING_CONDITION;
      }
    } else {
      // standalone team
      const team = await teamRepo.findById({
        id: options.teamId,
      });
      if (team?.parentId) {
        // a team without orgId is not supposed to have parentId
        return NOTHING_CONDITION;
      }
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

  async getCsvData({
    limit = 100,
    offset = 0,
    timeZone,
  }: {
    limit?: number;
    offset?: number;
    timeZone: string;
  }) {
    const DATE_FORMAT = "YYYY-MM-DD";
    const TIME_FORMAT = "HH:mm:ss";
    const baseConditions = await this.getBaseConditions();

    // Get total count first
    const totalCountQuery = Prisma.sql`
      SELECT COUNT(*)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
    `;

    const totalCountResult = await this.prisma.$queryRaw<[{ count: number }]>(totalCountQuery);
    const totalCount = totalCountResult[0]?.count || 0;

    // 1. Get booking data from BookingTimeStatusDenormalized
    const csvDataQuery = Prisma.sql`
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
    >(csvDataQuery);

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

    // 6. Combine booking data with attendee data and add ISO timestamp columns
    const data = csvData.map((bookingTimeStatus) => {
      const dateAndTime = {
        createdAt: bookingTimeStatus.createdAt.toISOString(),
        createdAt_date: dayjs(bookingTimeStatus.createdAt).tz(timeZone).format(DATE_FORMAT),
        createdAt_time: dayjs(bookingTimeStatus.createdAt).tz(timeZone).format(TIME_FORMAT),
        startTime: bookingTimeStatus.startTime.toISOString(),
        startTime_date: dayjs(bookingTimeStatus.startTime).tz(timeZone).format(DATE_FORMAT),
        startTime_time: dayjs(bookingTimeStatus.startTime).tz(timeZone).format(TIME_FORMAT),
        endTime: bookingTimeStatus.endTime.toISOString(),
        endTime_date: dayjs(bookingTimeStatus.endTime).tz(timeZone).format(DATE_FORMAT),
        endTime_time: dayjs(bookingTimeStatus.endTime).tz(timeZone).format(TIME_FORMAT),
      };

      if (!bookingTimeStatus.uid) {
        // should not be reached because we filtered above
        const nullAttendeeFields: Record<string, null> = {};
        for (let i = 1; i <= maxAttendees; i++) {
          nullAttendeeFields[`attendee${i}`] = null;
        }

        return {
          ...bookingTimeStatus,
          ...dateAndTime,
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
          ...dateAndTime,
          noShowGuests: null,
          noShowGuestsCount: 0,
          ...nullAttendeeFields,
        };
      }

      return {
        ...bookingTimeStatus,
        ...dateAndTime,
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

    const query = Prisma.sql`
    WITH booking_stats AS (
      SELECT
        DATE("createdAt" AT TIME ZONE ${timeZone}) as "date",
        "timeStatus",
        COALESCE("noShowHost", false) AS "noShowHost",
        COUNT(*) as "bookingsCount"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
      GROUP BY
        1, 2, 3
    ),
    guest_stats AS (
      SELECT
        DATE(b."createdAt" AT TIME ZONE ${timeZone}) as "date",
        b."timeStatus",
        COALESCE(b."noShowHost", false) AS "noShowHost",
        COUNT(CASE WHEN a."noShow" = true THEN 1 END) as "noShowGuests"
      FROM "BookingTimeStatusDenormalized" b
      INNER JOIN "Attendee" a ON a."bookingId" = b.id
      WHERE ${baseConditions}
      GROUP BY
        1, 2, 3
    )
    SELECT
      bs."date",
      CAST(bs."bookingsCount" AS INTEGER) AS "bookingsCount",
      bs."timeStatus",
      bs."noShowHost",
      CAST(COALESCE(gs."noShowGuests", 0) AS INTEGER) AS "noShowGuests"
    FROM booking_stats bs
    LEFT JOIN guest_stats gs ON (
      bs."date" = gs."date" AND
      bs."timeStatus" = gs."timeStatus" AND
      bs."noShowHost" = gs."noShowHost"
    )
    ORDER BY bs."date"
  `;

    const data = await this.prisma.$queryRaw<
      {
        date: Date;
        bookingsCount: number;
        timeStatus: string;
        noShowHost: boolean;
        noShowGuests: number;
      }[]
    >(query);

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

    const query = Prisma.sql`
      SELECT
        "eventTypeId",
        COUNT(id)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "eventTypeId" IS NOT NULL
      GROUP BY "eventTypeId"
      ORDER BY count DESC
      LIMIT 10
    `;

    const bookingsFromSelected = await this.prisma.$queryRaw<
      Array<{
        eventTypeId: number;
        count: number;
      }>
    >(query);

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

  async getMembersStatsWithCount({
    type = "all",
    sortOrder = "DESC",
    completed,
  }: {
    type?: "all" | "accepted" | "cancelled" | "noShow";
    sortOrder?: "ASC" | "DESC";
    completed?: boolean;
  } = {}): Promise<UserStatsData> {
    const baseConditions = await this.getBaseConditions();

    const conditions: Prisma.Sql[] = [Prisma.sql`"userId" IS NOT NULL`];

    if (type === "cancelled") {
      conditions.push(Prisma.sql`status = 'cancelled'`);
    } else if (type === "noShow") {
      conditions.push(Prisma.sql`"noShowHost" = true`);
    } else if (type === "accepted") {
      conditions.push(Prisma.sql`status = 'accepted'`);
    }

    if (completed) {
      conditions.push(Prisma.sql`"endTime" <= NOW()`);
    }

    const additionalCondition = conditions.reduce((acc, condition, index) => {
      if (index === 0) return condition;
      return Prisma.sql`(${acc}) AND (${condition})`;
    });

    const query = Prisma.sql`
      SELECT
        "userId",
        COUNT(id)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE (${baseConditions}) AND (${additionalCondition})
      GROUP BY "userId"
      ORDER BY count ${sortOrder === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
      LIMIT 10
    `;

    const bookingsFromTeam = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        count: number;
      }>
    >(query);

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

    const query = Prisma.sql`
      SELECT
        "userId",
        AVG("rating")::float as "count"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "userId" IS NOT NULL AND "rating" IS NOT NULL
      GROUP BY "userId"
      ORDER BY "count" ${sortOrder === "ASC" ? Prisma.sql`ASC` : Prisma.sql`DESC`}
      LIMIT 10
    `;

    const bookingsFromTeam = await this.prisma.$queryRaw<
      Array<{
        userId: number;
        count: number;
      }>
    >(query);

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

    const query = Prisma.sql`
      SELECT
        "userId",
        "rating",
        "ratingFeedback"
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions} AND "ratingFeedback" IS NOT NULL
      ORDER BY "endTime" DESC
      LIMIT 10
    `;

    const bookingsFromTeam = await this.prisma.$queryRaw<
      Array<{
        userId: number | null;
        rating: number | null;
        ratingFeedback: string | null;
      }>
    >(query);

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

    const query = Prisma.sql`
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
    >(query);

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

  async getRecentNoShowGuests() {
    const baseConditions = await this.getBaseConditions();

    const query = Prisma.sql`
      WITH booking_attendee_stats AS (
        SELECT
          b.id as booking_id,
          b."startTime",
          b.title as event_type_name,
          COUNT(a.id) as total_attendees,
          COUNT(CASE WHEN a."noShow" = true THEN 1 END) as no_show_attendees
        FROM "BookingTimeStatusDenormalized" b
        INNER JOIN "Attendee" a ON a."bookingId" = b.id
        WHERE ${baseConditions} and b.status = 'accepted'
        GROUP BY b.id, b."startTime", b.title
        HAVING COUNT(a.id) > 0 AND COUNT(a.id) = COUNT(CASE WHEN a."noShow" = true THEN 1 END)
      ),
      recent_no_shows AS (
        SELECT
          bas.booking_id,
          bas."startTime",
          bas.event_type_name,
          a.name as guest_name,
          a.email as guest_email,
          ROW_NUMBER() OVER (PARTITION BY bas.booking_id ORDER BY a.id) as rn
        FROM booking_attendee_stats bas
        INNER JOIN "Attendee" a ON a."bookingId" = bas.booking_id
        WHERE a."noShow" = true
      )
      SELECT
        booking_id as "bookingId",
        "startTime",
        event_type_name as "eventTypeName",
        guest_name as "guestName",
        guest_email as "guestEmail"
      FROM recent_no_shows
      WHERE rn = 1
      ORDER BY "startTime" DESC
      LIMIT 10
    `;

    const recentNoShowBookings = await this.prisma.$queryRaw<
      Array<{
        bookingId: number;
        startTime: Date;
        eventTypeName: string;
        guestName: string;
        guestEmail: string;
      }>
    >(query);

    return recentNoShowBookings;
  }

  calculatePreviousPeriodDates() {
    const result = extractDateRangeFromColumnFilters(this.filters?.columnFilters);
    const startDate = dayjs(result.startDate);
    const endDate = dayjs(result.endDate);

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
    const permissionCheckService = new PermissionCheckService();
    return await permissionCheckService.checkPermission({
      userId,
      teamId: targetId,
      permission: "insights.read",
      fallbackRoles: [MembershipRole.OWNER, MembershipRole.ADMIN],
    });
  }
}
