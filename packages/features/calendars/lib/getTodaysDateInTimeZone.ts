import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import dayjs from "@calcom/dayjs";

// with new Date(), we get browser's current date.
// The below function gets today's date w.r.t to selected timezone.
// Example :
// Consider browser current date-time is - "Sat Jul 20 2024 01:00:00 AM (Asia/Kolkata GMT +5:30)".
// And, if preferred timezone is "Pacific/Pago GMT -11:00", we need to get today's date as "Fri Jul 19".
export function getTodaysDateInTimeZone(
  selectedTimeZone: string = dayjs.tz.guess() || "Europe/London"
): Date {
  // These plugins is requred for dayjs to calculate today's date w.r.t input timezone
  dayjs.extend(utc);
  dayjs.extend(timezone);

  const todayDateInPreferredTZ = dayjs().tz(selectedTimeZone);

  // 'todayDateInPreferredTZ' is dayjs date, we need to convert this into type 'Date',
  // as input required for getAvailableDatesInMonth() is 'Date' type.
  const offsetMinutes = dayjs().utcOffset();
  const jsDate = new Date(`${todayDateInPreferredTZ.format("YYYY-MM-DDTHH:mm:ss")}Z`); // UTC format
  jsDate.setMinutes(jsDate.getMinutes() - offsetMinutes); // Adjust to local timezone

  return jsDate;
}
