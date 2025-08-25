import { startOfMonth, startOfDay, addMonths, addDays } from "date-fns";

type GetTimesForScheduleProps = {
  month?: string | null;
  selectedDate?: string | null;
  monthCount?: number;
  dayCount?: number | null;
};

const parseMonth = (monthString: string) => {
  const [year, month] = monthString.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1));
};

export const getTimesForSchedule = ({
  month,
  monthCount = 1,
  selectedDate,
  dayCount,
}: GetTimesForScheduleProps): [string, string] => {
  const now = new Date();
  const browsingMonthStartDate = month ? parseMonth(month) : startOfMonth(now);
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
    startTime = new Date(selectedDate);
    endTime = addDays(startTime, dayCount);
  } else if (
    browsingMonthStartDate.getFullYear() === now.getFullYear() &&
    browsingMonthStartDate.getMonth() === now.getMonth()
  ) {
    startTime = startOfDay(now);
    endTime = addDays(startTime, dayCount);
  } else {
    startTime = browsingMonthStartDate;
    endTime = addDays(browsingMonthStartDate, dayCount);
  }

  return [startTime.toISOString(), endTime.toISOString()];
};
