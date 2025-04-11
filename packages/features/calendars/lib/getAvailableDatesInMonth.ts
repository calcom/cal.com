import type { Dayjs } from "dayjs";

import dayjs from "@calcom/dayjs";

// calculate the available dates in the month:
// *) Intersect with included dates.
// *) Dates in the past are not available.
// *) Use right amount of days in given month. (28, 30, 31)
export function getAvailableDatesInMonth({
  browsingDate,
  minDate = new Date(),
  includedDates,
}: {
  browsingDate: Dayjs; // in the future this could be TimezonedDate
  minDate?: Date;
  includedDates?: string[];
}) {
  // get minDate but with the same UTC offset as the browsingDate.
  const minDayjs = dayjs(minDate).utcOffset(browsingDate.utcOffset());
  // Get the later date (the one that is not in the past) + lose the time part.
  let date = dayjs.max(browsingDate.startOf("day"), minDayjs.startOf("day"));

  const dates = [];
  const lastDateOfMonth = date.endOf("month");
  for (
    ;
    /* date already defined; no initializer needed */ // Check if date is before the last date of the month
    // or is the same day, in the same month, in the same year.
    date.valueOf() <= lastDateOfMonth.valueOf();
    // startOf next day, this happens after passing current date
    date = date.add(1, "day")
  ) {
    const dateString = date.format("YYYY-MM-DD");
    // intersect included dates
    if (includedDates && !includedDates.includes(dateString)) {
      continue;
    }
    dates.push(dateString);
  }
  return dates;
}
