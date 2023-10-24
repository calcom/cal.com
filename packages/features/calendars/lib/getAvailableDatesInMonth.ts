import { daysInMonth, yyyymmdd } from "@calcom/lib/date-fns";

// calculate the available dates in the month:
// *) Intersect with included dates.
// *) Dates in the past are not available.
// *) Use right amount of days in given month. (28, 30, 31)
export function getAvailableDatesInMonth({
  browsingDate, // pass as UTC
  minDate = new Date(),
  includedDates,
}: {
  browsingDate: Date;
  minDate?: Date;
  includedDates?: string[];
}) {
  const dates = [];
  const lastDateOfMonth = new Date(
    browsingDate.getUTCFullYear(),
    browsingDate.getUTCMonth(),
    daysInMonth(browsingDate)
  );
  for (
    let date = browsingDate > minDate ? browsingDate : minDate;
    date <= lastDateOfMonth;
    date = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  ) {
    // intersect included dates
    if (includedDates && !includedDates.includes(yyyymmdd(date))) {
      continue;
    }
    dates.push(yyyymmdd(date));
  }
  return dates;
}
