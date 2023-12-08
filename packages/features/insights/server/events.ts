import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { readonlyPrisma as prisma } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";

import type { RawDataInput } from "./raw-data.schema";

interface ITimeRange {
  start: Dayjs;
  end: Dayjs;
}

type TimeViewType = "week" | "month" | "year" | "day";

class EventsInsights {
  static getBookingsInTimeRange = async (
    timeRange: ITimeRange,
    where: Prisma.BookingTimeStatusWhereInput
  ) => {
    const { start, end } = timeRange;

    const events = await prisma.bookingTimeStatus.count({
      where: {
        ...where,
        createdAt: {
          gte: start.toISOString(),
          lte: end.toISOString(),
        },
      },
    });

    return events;
  };

  static getCreatedEventsInTimeRange = async (
    timeRange: ITimeRange,
    where: Prisma.BookingTimeStatusWhereInput
  ) => {
    const result = await this.getBookingsInTimeRange(timeRange, where);

    return result;
  };

  static getCancelledEventsInTimeRange = async (
    timeRange: ITimeRange,
    where: Prisma.BookingTimeStatusWhereInput
  ) => {
    const result = await this.getBookingsInTimeRange(timeRange, {
      ...where,
      timeStatus: "cancelled",
    });

    return result;
  };

  static getCompletedEventsInTimeRange = async (
    timeRange: ITimeRange,
    where: Prisma.BookingTimeStatusWhereInput
  ) => {
    const result = await this.getBookingsInTimeRange(timeRange, {
      ...where,
      timeStatus: "completed",
    });

    return result;
  };

  static getRescheduledEventsInTimeRange = async (
    timeRange: ITimeRange,
    where: Prisma.BookingTimeStatusWhereInput
  ) => {
    const result = await this.getBookingsInTimeRange(timeRange, {
      ...where,
      timeStatus: "rescheduled",
    });

    return result;
  };

  static getBaseBookingCountForEventStatus = async (where: Prisma.BookingTimeStatusWhereInput) => {
    const baseBookings = await prisma.bookingTimeStatus.count({
      where,
    });

    return baseBookings;
  };

  static getTotalCompletedEvents = async (whereConditional: Prisma.BookingTimeStatusWhereInput) => {
    return await prisma.bookingTimeStatus.count({
      where: {
        ...whereConditional,
        timeStatus: "completed",
      },
    });
  };

  static getTotalRescheduledEvents = async (whereConditional: Prisma.BookingTimeStatusWhereInput) => {
    return await prisma.bookingTimeStatus.count({
      where: {
        ...whereConditional,
        timeStatus: "rescheduled",
      },
    });
  };

  static getTotalCancelledEvents = async (whereConditional: Prisma.BookingTimeStatusWhereInput) => {
    return await prisma.bookingTimeStatus.count({
      where: {
        ...whereConditional,
        timeStatus: "cancelled",
      },
    });
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
    const now = dayjs();
    const endOfDay = now.endOf("day");
    let pivotDate = dayjs(startDate);
    const dates: string[] = [];

    while (pivotDate.isBefore(endDate) || pivotDate.isSame(endDate)) {
      const pivotAdded = pivotDate.add(6, "day");
      const weekEndDate = pivotAdded.isBefore(endOfDay) ? pivotAdded : endOfDay;
      dates.push(pivotDate.format("YYYY-MM-DD"));

      if (pivotDate.isSame(endDate)) {
        break;
      }

      pivotDate = weekEndDate.add(1, "day");
    }

    return dates;
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
      },
      where: whereConditional,
    });

    return csvData;
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
            teamId: null,
          },
          {
            teamId: {
              in: [organizationId, ...teamsFromOrg.map((t) => t.id)],
            },
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
          },
          {
            userId: {
              in: userIdsFromTeam,
            },
            teamId: null,
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
