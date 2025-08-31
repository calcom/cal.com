import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { withReporting } from "@calcom/lib/sentryWrapper";
import { weekStartNum } from "@calcom/lib/weekstart";

import type { IntervalLimitUnit } from "../intervalLimitSchema";

function _getPeriodStartDatesBetween(
  dateFrom: Dayjs,
  dateTo: Dayjs,
  period: IntervalLimitUnit,
  timeZone?: string,
  weekStart?: string
): Dayjs[] {
  const dates = [];
  let currentDate: Dayjs;

  if (timeZone) {
    currentDate = dayjs(dateFrom).tz(timeZone);
  } else {
    currentDate = dayjs(dateFrom);
  }

  // For weekly periods, align to the user's preferred week start
  if (period === "week") {
    const weekStartName = weekStart || "Sunday";
    const weekStartIndex = weekStartNum(weekStartName);

    const currentDayIndex = currentDate.day();
    const daysToSubtract = (currentDayIndex - weekStartIndex + 7) % 7;
    currentDate = currentDate.subtract(daysToSubtract, "day").startOf("day");
  } else {
    currentDate = currentDate.startOf(period);
  }

  while (currentDate.isBefore(dateTo) || currentDate.isSame(dateTo, period)) {
    dates.push(currentDate);

    if (period === "week") {
      currentDate = currentDate.add(1, "week");
    } else {
      currentDate = currentDate.add(1, period).startOf(period);
    }
  }

  return dates;
}

export const getPeriodStartDatesBetween = withReporting(
  _getPeriodStartDatesBetween,
  "getPeriodStartDatesBetween"
);
