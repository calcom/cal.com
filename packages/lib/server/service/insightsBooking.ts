import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { DateRange } from "@calcom/features/insights/server/events";
import type { readonlyPrisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../repository/membership";
import { TeamRepository } from "../repository/team";

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
  eventTypeId: z.number().optional(),
  memberUserId: z.number().optional(),
  dateRange: z
    .object({
      target: z.enum(["createdAt", "startTime"]),
      startDate: z.string(),
      endDate: z.string(),
    })
    .optional(),
});

const NOTHING_CONDITION = Prisma.sql`1=0`;

const bookingDataKeys = new Set(Object.keys(bookingDataSchema.shape));

export class InsightsBookingService {
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

    if (this.filters.eventTypeId) {
      conditions.push(
        Prisma.sql`("eventTypeId" = ${this.filters.eventTypeId}) OR ("eventParentId" = ${this.filters.eventTypeId})`
      );
    }

    if (this.filters.memberUserId) {
      conditions.push(Prisma.sql`"userId" = ${this.filters.memberUserId}`);
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

  async buildAuthorizationConditions(): Promise<Prisma.Sql> {
    if (!this.options) {
      return NOTHING_CONDITION;
    }
    const isOwnerOrAdmin = await this.isOrgOwnerOrAdmin(this.options.userId, this.options.orgId);
    if (!isOwnerOrAdmin) {
      return NOTHING_CONDITION;
    }

    if (this.options.scope === "user") {
      return Prisma.sql`("userId" = ${this.options.userId}) AND ("teamId" IS NULL)`;
    } else if (this.options.scope === "org") {
      return await this.buildOrgAuthorizationCondition(this.options);
    } else if (this.options.scope === "team") {
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
    if (!childTeamOfOrg) {
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
    const result = dateRanges.map(({ formattedDate }) => {
      const eventData = {
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

  private async isOrgOwnerOrAdmin(userId: number, orgId: number): Promise<boolean> {
    // Check if the user is an owner or admin of the organization
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({ userId, teamId: orgId });
    return Boolean(
      membership &&
        membership.accepted &&
        membership.role &&
        (membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN)
    );
  }
}
