import { startOfMonth, startOfDay, isSameMonth, addMonths, addDays } from "date-fns";

import type { UseScheduleWithCacheArgs } from "./useSchedule";

type UseTimesForScheduleProps = Pick<
  UseScheduleWithCacheArgs,
  "month" | "monthCount" | "dayCount" | "selectedDate"
>;

const parseMonth = (monthString: string) => {
  const [year, month] = monthString.split("-").map(Number);
  return new Date(year, month - 1);
};

export const useTimesForSchedule = ({
  month,
  monthCount = 1,
  selectedDate,
  dayCount,
}: UseTimesForScheduleProps): [string, string] => {
  const currentDate = new Date();
  const browsingMonthStartDate = month ? parseMonth(month) : startOfMonth(currentDate);
  const browsingMonthEndDate = addMonths(browsingMonthStartDate, monthCount);

  if (!dayCount || dayCount <= 0) {
    return [browsingMonthStartDate.toISOString(), browsingMonthEndDate.toISOString()];
  }
  // Why the non-null assertions? All of these arguments are checked in the enabled condition,
  // and the query will not run if they are null. However, the check in `enabled` does
  // no satisfy typescript.
  let startTime;
  let endTime;

  if (selectedDate) {
    const selectedDateObj = new Date(selectedDate);
    startTime = selectedDateObj.toISOString();
    endTime = addDays(selectedDateObj, dayCount).toISOString();
  } else if (isSameMonth(browsingMonthStartDate, currentDate)) {
    startTime = startOfDay(currentDate).toISOString();
    endTime = addDays(startOfDay(currentDate), dayCount).toISOString();
  } else {
    startTime = browsingMonthStartDate.toISOString();
    endTime = addDays(browsingMonthStartDate, dayCount).toISOString();
  }

  return [startTime, endTime];
};
