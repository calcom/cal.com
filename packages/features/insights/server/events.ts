import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { readonlyPrisma as prisma } from "@calcom/prisma";
import { Prisma } from "@calcom/prisma/client";

import type { RawDataInput } from "./raw-data.schema";

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
}

export interface GetDateRangesParams {
  startDate: string;
  endDate: string;
  timeZone: string;
  timeView: "day" | "week" | "month" | "year";
  weekStart: "Sunday" | "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday";
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
      },
    });

    const bookingMap = new Map(bookings.map((booking) => [booking.uid, booking.attendees[0] || null]));

    const data = csvData.map((bookingTimeStatus) => {
      if (!bookingTimeStatus.uid) {
        // should not be reached because we filtered above
        return bookingTimeStatus;
      }

      const booker = bookingMap.get(bookingTimeStatus.uid);

      if (!booker) {
        return bookingTimeStatus;
      }

      return {
        ...bookingTimeStatus,
        noShowGuest: booker.noShow,
        bookerEmail: booker.email,
        bookerName: booker.name,
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
    props: RawDataInput & { organizationId: number | null; isOrgAdminOrOwner: boolean | null }
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

export { EventsInsights };
