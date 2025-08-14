import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

type TimeViewType = "week" | "month" | "year" | "day";

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

export const getTimeView = (startDate: string, endDate: string) => {
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

export const getDateRanges = ({
  startDate: _startDate,
  endDate: _endDate,
  timeZone,
  timeView,
  weekStart,
}: GetDateRangesParams): DateRange[] => {
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
        formattedDate: formatPeriod({
          start: currentStartDate,
          end: currentEndDate,
          timeView,
          wholeStart: startDate,
          wholeEnd: endDate,
        }),
        formattedDateFull: formatPeriodFull({
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
      formattedDate: formatPeriod({
        start: currentStartDate,
        end: currentEndDate,
        timeView,
        wholeStart: startDate,
        wholeEnd: endDate,
      }),
      formattedDateFull: formatPeriodFull({
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
};

export const formatPeriod = ({
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
}): string => {
  const omitYear = wholeStart.year() === wholeEnd.year();

  switch (timeView) {
    case "day": {
      const shouldShowMonth = wholeStart.isSame(start, "day") || start.date() === 1;

      if (shouldShowMonth) {
        return omitYear ? start.format("MMM D") : start.format("MMM D, YYYY");
      } else {
        return omitYear ? start.format("D") : start.format("D, YYYY");
      }
    }
    case "week": {
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
    }
    case "month": {
      return omitYear ? start.format("MMM") : start.format("MMM YYYY");
    }
    case "year": {
      return start.format("YYYY");
    }
    default:
      return "";
  }
};

export const formatPeriodFull = ({
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
}): string => {
  const omitYear = wholeStart.year() === wholeEnd.year();

  switch (timeView) {
    case "day": {
      return omitYear ? start.format("MMM D") : start.format("MMM D, YYYY");
    }
    case "week": {
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
    }
    case "month": {
      return omitYear ? start.format("MMM") : start.format("MMM YYYY");
    }
    case "year": {
      return start.format("YYYY");
    }
    default:
      return "";
  }
};

export const getTimeLine = async (timeView: TimeViewType, startDate: Dayjs, endDate: Dayjs) => {
  let resultTimeLine: string[] = [];

  if (timeView) {
    switch (timeView) {
      case "day":
        resultTimeLine = getDailyTimeline(startDate, endDate);
        break;
      case "week":
        resultTimeLine = getWeekTimeline(startDate, endDate);
        break;
      case "month":
        resultTimeLine = getMonthTimeline(startDate, endDate);
        break;
      case "year":
        resultTimeLine = getYearTimeline(startDate, endDate);
        break;
      default:
        resultTimeLine = getWeekTimeline(startDate, endDate);
        break;
    }
  }

  return resultTimeLine;
};

export function getDailyTimeline(startDate: Dayjs, endDate: Dayjs): string[] {
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

export function getWeekTimeline(startDate: Dayjs, endDate: Dayjs): string[] {
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

export function getMonthTimeline(startDate: Dayjs, endDate: Dayjs) {
  let pivotDate = dayjs(startDate);
  const dates = [];
  while (pivotDate.isBefore(endDate)) {
    pivotDate = pivotDate.set("month", pivotDate.get("month") + 1);

    dates.push(pivotDate.format("YYYY-MM-DD"));
  }
  return dates;
}

export function getYearTimeline(startDate: Dayjs, endDate: Dayjs) {
  let pivotDate = dayjs(startDate);
  const dates = [];
  while (pivotDate.isBefore(endDate)) {
    pivotDate = pivotDate.set("year", pivotDate.get("year") + 1);
    dates.push(pivotDate.format("YYYY-MM-DD"));
  }
  return dates;
}
