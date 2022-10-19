import dayjs, { Dayjs } from "@calcom/dayjs";

// converts a date to 2022-04-25 for example.
export const yyyymmdd = (date: Date | Dayjs) =>
  date instanceof Date ? dayjs(date).format("YYYY-MM-DD") : date.format("YYYY-MM-DD");

export const daysInMonth = (date: Date | Dayjs) =>
  date instanceof Date ? dayjs(date).daysInMonth() : date.daysInMonth();

/**
 * Expects timeFormat to be either 12 or 24, if null or undefined
 * is passed in, we always default back to 24 hour notation.
 */
export const formatTime = (
  date: string | Date | Dayjs,
  timeFormat?: number | null,
  timeZone?: string | null
) =>
  timeZone
    ? dayjs(date)
        .tz(timeZone)
        .format(timeFormat === 12 ? "h:mma" : "HH:mm")
    : dayjs(date).format(timeFormat === 12 ? "h:mma" : "HH:mm");

/**
 * Sorts two timezones by their offset from GMT.
 */
export const sortByTimezone = (timezoneA: string, timezoneB: string) => {
  const timeAGmt = Intl.DateTimeFormat("en", {
    timeZone: timezoneA,
    timeZoneName: "shortOffset",
  })
    .format(new Date())
    .split("GMT")[1];

  const timeBGmt = Intl.DateTimeFormat("en", {
    timeZone: timezoneB,
    timeZoneName: "shortOffset",
  })
    .format(new Date())
    .split("GMT")[1];

  if (timeAGmt === timeBGmt) return 0;
  return Number(timeAGmt) < Number(timeBGmt) ? -1 : 1;
};

/**
 * Verifies given time is a day before in timezoneB.
 */
export const isPreviousDayInTimezone = (time: string, timezoneA: string, timezoneB: string) => {
  const timeInTimezoneB = formatTime(time, 24, timezoneB);
  if (time === timeInTimezoneB) return false;

  // Eg time = 12:00 and timeInTimezoneB = 23:00
  const hoursTimezoneBIsLater = timeInTimezoneB.localeCompare(time) === 1;
  // If it is 23:00, does timezoneA come before or after timezoneB in GMT?
  const timezoneBIsEarlierTimezone = sortByTimezone(timezoneA, timezoneB) === 1;
  return hoursTimezoneBIsLater && timezoneBIsEarlierTimezone;
};

/**
 * Verifies given time is a day after in timezoneB.
 */
export const isNextDayInTimezone = (time: string, timezoneA: string, timezoneB: string) => {
  const timeInTimezoneB = formatTime(time, 24, timezoneB);
  if (time === timeInTimezoneB) return false;

  // Eg time = 12:00 and timeInTimezoneB = 09:00
  const hoursTimezoneBIsEarlier = timeInTimezoneB.localeCompare(time) === -1;
  // If it is 09:00, does timezoneA come before or after timezoneB in GMT?
  const timezoneBIsLaterTimezone = sortByTimezone(timezoneA, timezoneB) === -1;
  return hoursTimezoneBIsEarlier && timezoneBIsLaterTimezone;
};
