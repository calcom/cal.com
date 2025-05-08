import dayjs from "@calcom/dayjs";

import type { UseScheduleWithCacheArgs } from "./useSchedule";

type UseTimesForScheduleProps = Pick<
  UseScheduleWithCacheArgs,
  "month" | "monthCount" | "dayCount" | "selectedDate" | "prefetchNextMonth"
>;

export interface ScheduleTimeRanges {
  firstWeekStartTime: string;
  firstWeekEndTime: string;
  fullPeriodEndTime: string;
}

export const useTimesForSchedule = ({
  month,
  monthCount,
  selectedDate,
  dayCount,
  prefetchNextMonth,
}: UseTimesForScheduleProps): [string, string] & ScheduleTimeRanges => {
  const now = dayjs();
  const monthDayjs = month ? dayjs(month) : now;
  const nextMonthDayjs = monthDayjs.add(monthCount ? monthCount : 1, "month");
  // Why the non-null assertions? All of these arguments are checked in the enabled condition,
  // and the query will not run if they are null. However, the check in `enabled` does
  // no satisfy typescript.
  let startTime;
  let endTime;
  let firstWeekEndTime;

  if (!!dayCount && dayCount > 0) {
    if (selectedDate) {
      startTime = dayjs(selectedDate).toISOString();
      firstWeekEndTime = dayjs(selectedDate).add(Math.min(7, dayCount), "day").toISOString();
      endTime = dayjs(selectedDate).add(dayCount, "day").toISOString();
    } else if (monthDayjs.month() === now.month()) {
      startTime = now.startOf("day").toISOString();
      firstWeekEndTime = now.startOf("day").add(7, "day").toISOString();
      endTime = now.startOf("day").add(dayCount, "day").toISOString();
    } else {
      startTime = monthDayjs.startOf("month").toISOString();
      firstWeekEndTime = monthDayjs.startOf("month").add(7, "day").toISOString();
      endTime = monthDayjs.startOf("month").add(dayCount, "day").toISOString();
    }
  } else {
    startTime = monthDayjs.startOf("month").toISOString();
    firstWeekEndTime = monthDayjs.startOf("month").add(7, "day").toISOString();
    endTime = (prefetchNextMonth ? nextMonthDayjs : monthDayjs).endOf("month").toISOString();
  }

  const result = [startTime, endTime] as [string, string] & ScheduleTimeRanges;
  result.firstWeekStartTime = startTime;
  result.firstWeekEndTime = firstWeekEndTime;
  result.fullPeriodEndTime = endTime;

  return result;
};
