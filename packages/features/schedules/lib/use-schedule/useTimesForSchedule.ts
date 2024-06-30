import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import dayjs from "@calcom/dayjs";
import { useTimePreferences } from "@calcom/features/bookings/lib";

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
  // setting the initial start time w.r.t selected time zone.
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const selectedTimeZone = useTimePreferences().timezone;
  const now = dayjs().tz(selectedTimeZone);
  const monthDayjs = month ? dayjs.tz(month, "YYYY-MM", selectedTimeZone) : now;

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
