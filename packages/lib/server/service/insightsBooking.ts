import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { readonlyPrisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../repository/membership";
import { TeamRepository } from "../repository/team";

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

export type InsightsBookingServiceFilterOptions = {
  eventTypeId?: number;
  memberUserId?: number;
};

const NOTHING_CONDITION = Prisma.sql`1=0`;

export class InsightsBookingService {
  private prisma: typeof readonlyPrisma;
  private options: InsightsBookingServiceOptions | null;
  private filters?: InsightsBookingServiceFilterOptions;
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
    const validation = insightsBookingServiceOptionsSchema.safeParse(options);
    this.options = validation.success ? validation.data : null;

    this.filters = filters;
  }

  async getBookingsByHourStats({
    startDate,
    endDate,
    timeZone,
  }: {
    startDate: string;
    endDate: string;
    timeZone: string;
  }) {
    // Validate date formats
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw new Error(`Invalid date format: ${startDate} - ${endDate}`);
    }

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
        AND "startTime" >= ${startDate}::timestamp
        AND "startTime" <= ${endDate}::timestamp
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

  async getCsvData({
    startDate,
    endDate,
    limit = 100,
    offset = 0,
  }: {
    startDate: string;
    endDate: string;
    limit?: number;
    offset?: number;
  }) {
    // Validate date formats
    if (isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw new Error(`Invalid date format: ${startDate} - ${endDate}`);
    }

    const baseConditions = await this.getBaseConditions();

    // Get total count first
    const totalCountResult = await this.prisma.$queryRaw<[{ count: number }]>`
      SELECT COUNT(*)::int as count
      FROM "BookingTimeStatusDenormalized"
      WHERE ${baseConditions}
        AND "createdAt" >= ${startDate}::timestamp
        AND "createdAt" <= ${endDate}::timestamp
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
        AND "createdAt" >= ${startDate}::timestamp
        AND "createdAt" <= ${endDate}::timestamp
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
