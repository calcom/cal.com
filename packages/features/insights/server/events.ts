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

class EventsInsights {
  static countGroupedByStatusForRanges = async (
    whereConditional: Prisma.BookingTimeStatusWhereInput,
    startDate: Dayjs,
    endDate: Dayjs,
    timeView: "week" | "month" | "year" | "day"
  ): Promise<AggregateResult> => {
    // Determine the date truncation and date range based on timeView
    const formattedStartDate = dayjs(startDate).format("YYYY-MM-DD HH:mm:ss");
    const formattedEndDate = dayjs(endDate).format("YYYY-MM-DD HH:mm:ss");
    const whereClause = buildSqlCondition(whereConditional);

    const data = await prisma.$queryRaw<
      {
        periodStart: Date;
        bookingsCount: number;
        timeStatus: string;
        noShowHost: boolean;
        noShowGuests: number;
      }[]
    >`
    SELECT
      "periodStart",
      CAST(COUNT(*) AS INTEGER) AS "bookingsCount",
      CAST(COUNT(CASE WHEN "isNoShowGuest" = true THEN 1 END) AS INTEGER) AS "noShowGuests",
      "timeStatus",
      "noShowHost"
    FROM (
      SELECT
        DATE_TRUNC(${timeView}, "createdAt") AS "periodStart",
        "a"."noShow" AS "isNoShowGuest",
        "timeStatus",
        "noShowHost"
      FROM
        "BookingTimeStatus"
      JOIN
        "Attendee" "a" ON "a"."bookingId" = "BookingTimeStatus"."id"
      WHERE
        "createdAt" BETWEEN ${formattedStartDate}::timestamp AND ${formattedEndDate}::timestamp
        AND ${Prisma.raw(whereClause)}
    ) AS truncated_dates
    GROUP BY
      "periodStart",
      "timeStatus",
      "noShowHost"
    ORDER BY
      "periodStart";
  `;

    const aggregate: AggregateResult = {};
    data.forEach(({ periodStart, bookingsCount, timeStatus, noShowHost, noShowGuests }) => {
      const formattedDate = dayjs(periodStart).format("MMM D, YYYY");

      if (dayjs(periodStart).isAfter(endDate)) {
        return;
      }

      // Ensure the date entry exists in the aggregate object
      if (!aggregate[formattedDate]) {
        aggregate[formattedDate] = {
          completed: 0,
          rescheduled: 0,
          cancelled: 0,
          noShowHost: 0,
          _all: 0,
          uncompleted: 0,
          noShowGuests: 0,
        };
      }

      // Add to the specific status count
      const statusKey = timeStatus as keyof StatusAggregate;
      aggregate[formattedDate][statusKey] += Number(bookingsCount);

      // Always add to the total count (_all)
      aggregate[formattedDate]["_all"] += Number(bookingsCount);

      // Track no-show host counts separately
      if (noShowHost) {
        aggregate[formattedDate]["noShowHost"] += Number(bookingsCount);
      }

      // Track no-show guests explicitly
      aggregate[formattedDate]["noShowGuests"] += noShowGuests;
    });

    // Generate a complete list of expected date labels based on the timeline
    let current = dayjs(startDate);
    const expectedDates: string[] = [];

    while (current.isBefore(endDate) || current.isSame(endDate)) {
      const formattedDate = current.format("MMM D, YYYY");
      expectedDates.push(formattedDate);

      // Increment based on the selected timeView
      if (timeView === "day") {
        current = current.add(1, "day");
      } else if (timeView === "week") {
        current = current.add(1, "week");
      } else if (timeView === "month") {
        current = current.add(1, "month");
      } else if (timeView === "year") {
        current = current.add(1, "year");
      }
    }

    // Fill in any missing dates with zero counts
    expectedDates.forEach((label) => {
      if (!aggregate[label]) {
        aggregate[label] = {
          completed: 0,
          rescheduled: 0,
          cancelled: 0,
          noShowHost: 0,
          noShowGuests: 0,
          _all: 0,
          uncompleted: 0,
        };
      }
    });

    return aggregate;
  };

  static getTotalNoShowGuests = async (where: Prisma.BookingTimeStatusWhereInput) => {
    const bookings = await prisma.bookingTimeStatus.findMany({
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

  static countGroupedByStatus = async (where: Prisma.BookingTimeStatusWhereInput) => {
    const data = await prisma.bookingTimeStatus.groupBy({
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

  static getAverageRating = async (whereConditional: Prisma.BookingTimeStatusWhereInput) => {
    return await prisma.bookingTimeStatus.aggregate({
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

  static getTotalCSAT = async (whereConditional: Prisma.BookingTimeStatusWhereInput) => {
    const result = await prisma.bookingTimeStatus.findMany({
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

  static getTimeLine = async (timeView: TimeViewType, startDate: Dayjs, endDate: Dayjs) => {
    let resultTimeLine: string[] = [];

    if (timeView) {
      switch (timeView) {
        case "day":
          resultTimeLine = this.getDailyTimeline(startDate, endDate);
          break;
        case "week":
          resultTimeLine = this.getWeekTimeline(startDate, endDate);
          break;
        case "month":
          resultTimeLine = this.getMonthTimeline(startDate, endDate);
          break;
        case "year":
          resultTimeLine = this.getYearTimeline(startDate, endDate);
          break;
        default:
          resultTimeLine = this.getWeekTimeline(startDate, endDate);
          break;
      }
    }

    return resultTimeLine;
  };

  static getTimeView = (timeView: TimeViewType, startDate: Dayjs, endDate: Dayjs) => {
    let resultTimeView = timeView;

    if (startDate.diff(endDate, "day") > 90) {
      resultTimeView = "month";
    } else if (startDate.diff(endDate, "day") > 365) {
      resultTimeView = "year";
    }

    return resultTimeView;
  };

  static getDailyTimeline(startDate: Dayjs, endDate: Dayjs): string[] {
    const now = dayjs();
    const endOfDay = now.endOf("day");
    let pivotDate = dayjs(startDate);
    const dates: string[] = [];
    while ((pivotDate.isBefore(endDate) || pivotDate.isSame(endDate)) && pivotDate.isBefore(endOfDay)) {
      dates.push(pivotDate.format("YYYY-MM-DD"));
      pivotDate = pivotDate.add(1, "day");
    }
    return dates;
  }

  static getWeekTimeline(startDate: Dayjs, endDate: Dayjs): string[] {
    let pivotDate = dayjs(endDate);
    const dates: string[] = [];

    // Add the endDate as the last date in the timeline
    dates.push(pivotDate.format("YYYY-MM-DD"));

    // Move backwards in 6-day increments until reaching or passing the startDate
    while (pivotDate.isAfter(startDate)) {
      pivotDate = pivotDate.subtract(7, "day");
      if (pivotDate.isBefore(startDate)) {
        break;
      }
      dates.push(pivotDate.format("YYYY-MM-DD"));
    }

    // Reverse the array to have the timeline in ascending order
    return dates.reverse();
  }

  static getMonthTimeline(startDate: Dayjs, endDate: Dayjs) {
    let pivotDate = dayjs(startDate);
    const dates = [];
    while (pivotDate.isBefore(endDate)) {
      pivotDate = pivotDate.set("month", pivotDate.get("month") + 1);

      dates.push(pivotDate.format("YYYY-MM-DD"));
    }
    return dates;
  }

  static getYearTimeline(startDate: Dayjs, endDate: Dayjs) {
    const pivotDate = dayjs(startDate);
    const dates = [];
    while (pivotDate.isBefore(endDate)) {
      pivotDate.set("year", pivotDate.get("year") + 1);
      dates.push(pivotDate.format("YYYY-MM-DD"));
    }
    return dates;
  }

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

  static getCsvData = async (
    props: RawDataInput & {
      organizationId: number | null;
      isOrgAdminOrOwner: boolean | null;
    }
  ) => {
    // Obtain the where conditional
    const whereConditional = await this.obtainWhereConditional(props);

    const csvData = await prisma.bookingTimeStatus.findMany({
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
        username: true,
        rating: true,
        ratingFeedback: true,
        noShowHost: true,
      },
      where: whereConditional,
    });

    const uids = csvData.filter((b) => b.uid !== null).map((b) => b.uid as string);

    if (uids.length === 0) {
      return csvData;
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
          },
        },
      },
    });
    const bookingMap = new Map(bookings.map((booking) => [booking.uid, booking.attendees[0] || null]));

    return csvData.map((bookingTimeStatus) => {
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
        bookerEmail: booker.email,
        bookerName: booker.name,
      };
    });
  };

  /*
   * This is meant to be used for all functions inside insights router, ideally we should have a view that have all of this data
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
  static obtainWhereConditional = async (
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
    let whereConditional: Prisma.BookingTimeStatusWhereInput = {};
    let teamConditional: Prisma.TeamWhereInput = {};

    if (startDate && endDate) {
      whereConditional.createdAt = {
        gte: dayjs(startDate).toISOString(),
        lte: dayjs(endDate).toISOString(),
      };
    }

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
      teamConditional = {
        id: {
          in: [organizationId, ...teamsFromOrg.map((t) => t.id)],
        },
      };
      const usersFromOrg = await prisma.membership.findMany({
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
            isTeamBooking: false,
          },
          {
            teamId: {
              in: [organizationId, ...teamsFromOrg.map((t) => t.id)],
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
    const isOwnerAdminOfTeam = await prisma.membership.findFirst({
      where: {
        userId: sessionUserId,
        teamId,
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

    const isOwnerAdminOfParentTeam = await prisma.membership.findFirst({
      where: {
        userId: sessionUserId,
        teamId: team.parentId,
        accepted: true,
        role: {
          in: ["OWNER", "ADMIN"],
        },
      },
    });

    return !!isOwnerAdminOfParentTeam;
  };

  static objectToCsv(data: Record<string, unknown>[]) {
    // if empty data return empty string
    if (!data.length) {
      return "";
    }
    const header = `${Object.keys(data[0]).join(",")}\n`;
    const rows = data.map((obj: any) => `${Object.values(obj).join(",")}\n`);
    return header + rows.join("");
  }
}

export { EventsInsights };
