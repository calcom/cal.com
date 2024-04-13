import dayjs from "@calcom/dayjs";

import type { UseScheduleWithCacheArgs } from "./useSchedule";

type UseTimesForScheduleProps = Pick<
  UseScheduleWithCacheArgs,
  "month" | "monthCount" | "dayCount" | "selectedDate" | "prefetchNextMonth"
>;
export const useTimesForSchedule = ({
  month,
  monthCount,
  selectedDate,
  dayCount,
  prefetchNextMonth,
}: UseTimesForScheduleProps): [string, string] => {
  const now = dayjs();
  const monthDayjs = month ? dayjs(month) : now;
  const nextMonthDayjs = monthDayjs.add(monthCount ? monthCount : 1, "month");
  // Why the non-null assertions? All of these arguments are checked in the enabled condition,
  // and the query will not run if they are null. However, the check in `enabled` does
  // no satisfy typescript.
  let startTime;
  let endTime;

  if (!!dayCount && dayCount > 0) {
    if (selectedDate) {
      startTime = dayjs(selectedDate).toISOString();
      endTime = dayjs(selectedDate).add(dayCount, "day").toISOString();
    } else if (monthDayjs.month() === now.month()) {
      startTime = now.startOf("day").toISOString();
      endTime = now.startOf("day").add(dayCount, "day").toISOString();
    } else {
      startTime = monthDayjs.startOf("month").toISOString();
      endTime = monthDayjs.startOf("month").add(dayCount, "day").toISOString();
    }
  } else {
    startTime = monthDayjs.startOf("month").toISOString();
    endTime = (prefetchNextMonth ? nextMonthDayjs : monthDayjs).endOf("month").toISOString();
  }
  return [startTime, endTime];
};
