import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import dayjs from "@calcom/dayjs";

// This function gets current date w.r.t to selected timezone.
// returns date of type 'Date' (javascript native 'Date' type)
export function getTodaysDateInTimeZone(
  selectedTimeZone: string = dayjs.tz.guess() || "Europe/London"
): Date {
  dayjs.extend(utc);
  dayjs.extend(timezone);

  const todayDateInPreferredTZ = dayjs().tz(selectedTimeZone);

  // 'todayDateInPreferredTZ' is of type 'dayjs date', we need to convert this into type 'Date',
  const offsetMinutes = dayjs().utcOffset();
  const jsDate = new Date(`${todayDateInPreferredTZ.format("YYYY-MM-DDTHH:mm:ss")}Z`); // UTC format
  jsDate.setMinutes(jsDate.getMinutes() - offsetMinutes); // Adjust to local timezone

  return jsDate;
}
