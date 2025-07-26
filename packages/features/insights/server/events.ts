import dayjs from "@calcom/dayjs";
import { readonlyPrisma as prisma } from "@calcom/prisma";

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
