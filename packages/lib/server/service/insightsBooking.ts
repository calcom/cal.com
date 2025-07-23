import { Prisma } from "@prisma/client";
import { z } from "zod";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
// import { Prisma } from "@calcom/prisma/client";
import type { RawDataInput } from "@calcom/features/insights/server/raw-data.schema";
import type { readonlyPrisma } from "@calcom/prisma";
import { readonlyPrisma as prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

import { MembershipRepository } from "../repository/membership";
import { TeamRepository } from "../repository/team";

type TimeViewType = "week" | "month" | "year" | "day";

type StatusAggregate = {
  completed: number;
  rescheduled: number;
  cancelled: number;
  noShowHost: number;
  noShowGuests: number;
  _all: number;
  uncompleted: number;
};

type AggregateResult = {
  [date: string]: StatusAggregate;
};

// Recursive function to convert a JSON condition object into SQL
// Helper type guard function to check if value has 'in' property
function isInCondition(value: any): value is { in: any[] } {
  return typeof value === "object" && value !== null && "in" in value && Array.isArray(value.in);
}

// Helper type guard function to check if value has 'gte' property
function isGteCondition(value: any): value is { gte: any } {
  return typeof value === "object" && value !== null && "gte" in value;
}

// Helper type guard function to check if value has 'lte' property
function isLteCondition(value: any): value is { lte: any } {
  return typeof value === "object" && value !== null && "lte" in value;
}

function buildSqlCondition(condition: any): string {
  if (Array.isArray(condition.OR)) {
    return `(${condition.OR.map(buildSqlCondition).join(" OR ")})`;
  } else if (Array.isArray(condition.AND)) {
    return `(${condition.AND.map(buildSqlCondition).join(" AND ")})`;
  } else {
    const clauses: string[] = [];
    for (const [key, value] of Object.entries(condition)) {
      if (isInCondition(value)) {
        const valuesList = value.in.map((v) => `'${v}'`).join(", ");
        clauses.push(`"${key}" IN (${valuesList})`);
      } else if (isGteCondition(value)) {
        clauses.push(`"${key}" >= '${value.gte}'`);
      } else if (isLteCondition(value)) {
        clauses.push(`"${key}" <= '${value.lte}'`);
      } else {
        const formattedValue = typeof value === "string" ? `'${value}'` : value;
        clauses.push(`"${key}" = ${formattedValue}`);
      }
    }
    return clauses.join(" AND ");
  }
}

export interface DateRange {
  startDate: string;
  endDate: string;
  formattedDate: string;
  formattedDateFull: string;
}

export interface GetDateRangesParams {
  startDate: string;
  endDate: string;
  timeZone: string;
  timeView: "day" | "week" | "month" | "year";
  weekStart: "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | string;
}

class EventsInsights {
  static countGroupedByStatusForRanges = async (
    whereConditional: Prisma.BookingTimeStatusDenormalizedWhereInput,
    startDate: Dayjs,
    endDate: Dayjs,
    dateRanges: DateRange[],
    timeZone: string
  ): Promise<AggregateResult> => {
    const formattedStartDate = dayjs(startDate).format("YYYY-MM-DD HH:mm:ss");
    const formattedEndDate = dayjs(endDate).format("YYYY-MM-DD HH:mm:ss");
    const whereClause = buildSqlCondition(whereConditional);

    const data = await prisma.$queryRaw<
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
        "createdAt" BETWEEN ${formattedStartDate}::timestamp AND ${formattedEndDate}::timestamp
        AND ${Prisma.raw(whereClause)}
    ) AS bookings
    GROUP BY
      "date",
      "timeStatus",
      "noShowHost"
    ORDER BY
      "date";
  `;

    const aggregate: AggregateResult = {};

    // Initialize all date ranges with zero counts
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

    // Process the raw data
    data.forEach(({ date, bookingsCount, timeStatus, noShowHost, noShowGuests }) => {
      // Find which date range this date belongs to
      const dateRange = dateRanges.find((range) =>
        dayjs(date).isBetween(range.startDate, range.endDate, null, "[]")
      );

      if (!dateRange) return;

      const formattedDate = dateRange.formattedDate;
      const statusKey = timeStatus as keyof StatusAggregate;

      // Add to the specific status count
      aggregate[formattedDate][statusKey] += Number(bookingsCount);

      // Add to the total count (_all)
      aggregate[formattedDate]["_all"] += Number(bookingsCount);

      // Track no-show host counts separately
      if (noShowHost) {
        aggregate[formattedDate]["noShowHost"] += Number(bookingsCount);
      }

      // Track no-show guests explicitly
      aggregate[formattedDate]["noShowGuests"] += noShowGuests;
    });

    return aggregate;
  };

  static getTotalNoShowGuests = async (where: Prisma.BookingTimeStatusDenormalizedWhereInput) => {
    const bookings = await prisma.bookingTimeStatusDenormalized.findMany({
      where,
      select: {
        id: true,
      },
    });

    const { _count: totalNoShowGuests } = await prisma.attendee.aggregate({
      where: {
        bookingId: {
          in: bookings.map((booking) => booking.id),
        },
        noShow: true,
      },
      _count: true,
    });

    return totalNoShowGuests;
  };

  static countGroupedByStatus = async (where: Prisma.BookingTimeStatusDenormalizedWhereInput) => {
    const data = await prisma.bookingTimeStatusDenormalized.groupBy({
      where,
      by: ["timeStatus", "noShowHost"],
      _count: {
        _all: true,
      },
    });

    return data.reduce(
      (aggregate: { [x: string]: number }, item) => {
        if (typeof item.timeStatus === "string" && item) {
          aggregate[item.timeStatus] += item?._count?._all ?? 0;
          aggregate["_all"] += item?._count?._all ?? 0;

          if (item.noShowHost) {
            aggregate["noShowHost"] += item?._count?._all ?? 0;
          }
        }
        return aggregate;
      },
      {
        completed: 0,
        rescheduled: 0,
        cancelled: 0,
        noShowHost: 0,
        _all: 0,
      }
    );
  };

  static getAverageRating = async (whereConditional: Prisma.BookingTimeStatusDenormalizedWhereInput) => {
    return await prisma.bookingTimeStatusDenormalized.aggregate({
      _avg: {
        rating: true,
      },
      where: {
        ...whereConditional,
        rating: {
          not: null, // Exclude null ratings
        },
      },
    });
  };

  static getTotalCSAT = async (whereConditional: Prisma.BookingTimeStatusDenormalizedWhereInput) => {
    const result = await prisma.bookingTimeStatusDenormalized.findMany({
      where: {
        ...whereConditional,
        rating: {
          not: null,
        },
      },
      select: { rating: true },
    });

    const totalResponses = result.length;
    const satisfactoryResponses = result.filter((item) => item.rating && item.rating > 3).length;
    const csat = totalResponses > 0 ? (satisfactoryResponses / totalResponses) * 100 : 0;

    return csat;
  };

  static getTimeView = (startDate: string, endDate: string) => {
    const diff = dayjs(endDate).diff(dayjs(startDate), "day");
    if (diff > 365) {
      return "year";
    } else if (diff > 90) {
      return "month";
    } else if (diff > 30) {
      return "week";
    } else {
      return "day";
    }
  };

  static getPercentage = (actualMetric: number, previousMetric: number) => {
    const differenceActualVsPrevious = actualMetric - previousMetric;
    if (differenceActualVsPrevious === 0) {
      return 0;
    }
    const result = (differenceActualVsPrevious * 100) / previousMetric;

    if (isNaN(result) || !isFinite(result)) {
      return 0;
    }

    return result;
  };

  static getDateRanges({
    startDate: _startDate,
    endDate: _endDate,
    timeZone,
    timeView,
    weekStart,
  }: GetDateRangesParams): DateRange[] {
    if (!["day", "week", "month", "year"].includes(timeView)) {
      return [];
    }

    const startDate = dayjs(_startDate).tz(timeZone);
    const endDate = dayjs(_endDate).tz(timeZone);
    const ranges: DateRange[] = [];
    let currentStartDate = startDate;

    while (currentStartDate.isBefore(endDate)) {
      let currentEndDate = currentStartDate.endOf(timeView).tz(timeZone);

      // Adjust week boundaries based on weekStart parameter
      if (timeView === "week") {
        const weekStartNum =
          {
            Sunday: 0,
            Monday: 1,
            Tuesday: 2,
            Wednesday: 3,
            Thursday: 4,
            Friday: 5,
            Saturday: 6,
          }[weekStart] ?? 0;

        currentEndDate = currentEndDate.add(weekStartNum, "day");
        if (currentEndDate.subtract(7, "day").isAfter(currentStartDate)) {
          currentEndDate = currentEndDate.subtract(7, "day");
        }
      }

      if (currentEndDate.isAfter(endDate)) {
        currentEndDate = endDate;
        ranges.push({
          startDate: currentStartDate.toISOString(),
          endDate: currentEndDate.toISOString(),
          formattedDate: this.formatPeriod({
            start: currentStartDate,
            end: currentEndDate,
            timeView,
            wholeStart: startDate,
            wholeEnd: endDate,
          }),
          formattedDateFull: this.formatPeriodFull({
            start: currentStartDate,
            end: currentEndDate,
            timeView,
            wholeStart: startDate,
            wholeEnd: endDate,
          }),
        });
        break;
      }

      ranges.push({
        startDate: currentStartDate.toISOString(),
        endDate: currentEndDate.toISOString(),
        formattedDate: this.formatPeriod({
          start: currentStartDate,
          end: currentEndDate,
          timeView,
          wholeStart: startDate,
          wholeEnd: endDate,
        }),
        formattedDateFull: this.formatPeriodFull({
          start: currentStartDate,
          end: currentEndDate,
          timeView,
          wholeStart: startDate,
          wholeEnd: endDate,
        }),
      });

      currentStartDate = currentEndDate.add(1, "day").startOf("day").tz(timeZone);
    }

    return ranges;
  }

  static formatPeriod({
    start,
    end,
    timeView,
    wholeStart,
    wholeEnd,
  }: {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
    timeView: TimeViewType;
    wholeStart: dayjs.Dayjs;
    wholeEnd: dayjs.Dayjs;
  }): string {
    const omitYear = wholeStart.year() === wholeEnd.year();

    switch (timeView) {
      case "day":
        const shouldShowMonth = wholeStart.isSame(start, "day") || start.date() === 1;

        if (shouldShowMonth) {
          return omitYear ? start.format("MMM D") : start.format("MMM D, YYYY");
        } else {
          return omitYear ? start.format("D") : start.format("D, YYYY");
        }
      case "week":
        const startFormat = "MMM D";
        let endFormat = "MMM D";
        if (start.format("MMM") === end.format("MMM")) {
          endFormat = "D";
        }

        if (start.format("YYYY") !== end.format("YYYY")) {
          return `${start.format(`${startFormat} , YYYY`)} - ${end.format(`${endFormat}, YYYY`)}`;
        }

        if (omitYear) {
          return `${start.format(startFormat)} - ${end.format(endFormat)}`;
        } else {
          return `${start.format(startFormat)} - ${end.format(endFormat)}, ${end.format("YYYY")}`;
        }
      case "month":
        return omitYear ? start.format("MMM") : start.format("MMM YYYY");
      case "year":
        return start.format("YYYY");
      default:
        return "";
    }
  }

  static formatPeriodFull({
    start,
    end,
    timeView,
    wholeStart,
    wholeEnd,
  }: {
    start: dayjs.Dayjs;
    end: dayjs.Dayjs;
    timeView: TimeViewType;
    wholeStart: dayjs.Dayjs;
    wholeEnd: dayjs.Dayjs;
  }): string {
    const omitYear = wholeStart.year() === wholeEnd.year();

    switch (timeView) {
      case "day":
        return omitYear ? start.format("MMM D") : start.format("MMM D, YYYY");
      case "week":
        const startFormat = "MMM D";
        const endFormat = "MMM D";

        if (start.format("YYYY") !== end.format("YYYY")) {
          return `${start.format(`${startFormat}, YYYY`)} - ${end.format(`${endFormat}, YYYY`)}`;
        }

        if (omitYear) {
          return `${start.format(startFormat)} - ${end.format(endFormat)}`;
        } else {
          return `${start.format(startFormat)} - ${end.format(endFormat)}, ${end.format("YYYY")}`;
        }
      case "month":
        return omitYear ? start.format("MMM") : start.format("MMM YYYY");
      case "year":
        return start.format("YYYY");
      default:
        return "";
    }
  }

  static getCsvData = async (
    props: RawDataInput & {
      organizationId: number | null;
      isOrgAdminOrOwner: boolean | null;
    }
  ) => {
    // Obtain the where conditional
    const whereConditional = await this.obtainWhereConditionalForDownload(props);
    const limit = props.limit ?? 100; // Default batch size
    const offset = props.offset ?? 0;

    const totalCountPromise = prisma.bookingTimeStatusDenormalized.count({
      where: whereConditional,
    });

    const csvDataPromise = prisma.bookingTimeStatusDenormalized.findMany({
      select: {
        id: true,
        uid: true,
        title: true,
        createdAt: true,
        timeStatus: true,
        eventTypeId: true,
        eventLength: true,
        startTime: true,
        endTime: true,
        paid: true,
        userEmail: true,
        userUsername: true,
        rating: true,
        ratingFeedback: true,
        noShowHost: true,
      },
      where: whereConditional,
      skip: offset,
      take: limit,
    });

    const [totalCount, csvData] = await Promise.all([totalCountPromise, csvDataPromise]);

    const uids = csvData.filter((b) => b.uid !== null).map((b) => b.uid as string);

    if (uids.length === 0) {
      return { data: csvData, total: totalCount };
    }

    const bookings = await prisma.booking.findMany({
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

    const maxAttendees = Math.max(
      ...Array.from(bookingMap.values()).map((data) => data.attendeeList.length),
      0
    );

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
  };

  /*
   * This is meant to be used for all functions inside insights router,
   * but it's currently used only for CSV download.
   * Ideally we should have a view that have all of this data
   * The order where will be from the most specific to the least specific
   * starting from the top will be:
   * - memberUserId
   * - eventTypeId
   * - userId
   * - teamId
   * Generics will be:
   * - isAll
   * - startDate
   * - endDate
   * @param props
   * @returns
   */
  static obtainWhereConditionalForDownload = async (
    props: RawDataInput & {
      organizationId: number | null;
      isOrgAdminOrOwner: boolean | null;
    }
  ) => {
    const {
      startDate,
      endDate,
      teamId,
      userId,
      memberUserId,
      isAll,
      eventTypeId,
      organizationId,
      isOrgAdminOrOwner,
    } = props;

    // Obtain the where conditional
    let whereConditional: Prisma.BookingTimeStatusDenormalizedWhereInput = {};

    if (startDate && endDate) {
      whereConditional.createdAt = {
        gte: dayjs(startDate).toISOString(),
        lte: dayjs(endDate).toISOString(),
      };
    }

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

    if (isAll && isOrgAdminOrOwner && organizationId) {
      const teamsFromOrg = await prisma.team.findMany({
        where: {
          parentId: organizationId,
        },
        select: {
          id: true,
        },
      });
      if (teamsFromOrg.length === 0) {
        return {};
      }
      const teamIds: number[] = [organizationId, ...teamsFromOrg.map((t) => t.id)];
      const usersFromOrg = await prisma.membership.findMany({
        where: {
          teamId: {
            in: teamIds,
          },
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
            isTeamBooking: false,
          },
          {
            teamId: {
              in: teamIds,
            },
            isTeamBooking: true,
          },
        ],
      };
    }

    if (teamId && !isAll) {
      const usersFromTeam = await prisma.membership.findMany({
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

    return whereConditional;
  };

  static userIsOwnerAdminOfTeam = async ({
    sessionUserId,
    teamId,
  }: {
    sessionUserId: number;
    teamId: number;
  }) => {
    const isOwnerAdminOfTeam = await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId: sessionUserId,
          teamId,
        },
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    return !!isOwnerAdminOfTeam;
  };

  static userIsOwnerAdminOfParentTeam = async ({
    sessionUserId,
    teamId,
  }: {
    sessionUserId: number;
    teamId: number;
  }) => {
    const team = await prisma.team.findFirst({
      select: {
        parentId: true,
      },
      where: {
        id: teamId,
      },
    });

    if (!team || team.parentId === null) {
      return false;
    }

    const isOwnerAdminOfParentTeam = await prisma.membership.findUnique({
      where: {
        userId_teamId: {
          userId: sessionUserId,
          teamId: team.parentId,
        },
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    return !!isOwnerAdminOfParentTeam;
  };
}

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
  static getCsvData = async (
    props: RawDataInput & {
      organizationId: number | null;
      isOrgAdminOrOwner: boolean | null;
    }
  ) => {
    return await EventsInsights.getCsvData(props);
  };

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
        ? (
            await MembershipRepository.findAllByTeamIds({
              teamIds,
              select: { userId: true },
            })
          ).map((m) => m.userId)
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

  private async isOrgOwnerOrAdmin(userId: number, orgId: number): Promise<boolean> {
    // Check if the user is an owner or admin of the organization
    const membership = await MembershipRepository.findUniqueByUserIdAndTeamId({
      userId,
      teamId: orgId,
    });
    return Boolean(
      membership &&
        membership.accepted &&
        membership.role &&
        (membership.role === MembershipRole.OWNER || membership.role === MembershipRole.ADMIN)
    );
  }
}

export { EventsInsights };
