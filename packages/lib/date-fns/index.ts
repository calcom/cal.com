import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

// converts a date to 2022-04-25 for example.
export const yyyymmdd = (date: Date | Dayjs) =>
  date instanceof Date ? dayjs(date).format("YYYY-MM-DD") : date.format("YYYY-MM-DD");

// @see: https://github.com/iamkun/dayjs/issues/1272 - for the reason we're not using dayjs to do this.
export const daysInMonth = (date: Date | Dayjs) => {
  const [year, month] =
    date instanceof Date ? [date.getFullYear(), date.getMonth()] : [date.year(), date.month()];
  // strange JS quirk: new Date(2022, 12, 0).getMonth() = 11
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Expects timeFormat to be either 12 or 24, if null or undefined
 * is passed in, we always default back to 24 hour notation.
 */
export const formatTime = (
  date: string | Date | Dayjs,
  timeFormat?: number | null,
  timeZone?: string | null
) => {
  // console.log(timeZone, date);
  return timeZone
    ? dayjs(date)
        .tz(timeZone)
        .format(timeFormat === 12 ? "h:mma" : "HH:mm")
    : dayjs(date).format(timeFormat === 12 ? "h:mma" : "HH:mm");
};

/**
 * Returns a localized and translated date or time, based on the native
 * Intl.DateTimeFormat available to JS. Undefined values mean the browser's
 * locale will be used.
 */
export const formatLocalizedDateTime = (
  date: Date | Dayjs,
  options: Intl.DateTimeFormatOptions = {},
  locale: string | undefined = undefined
) => {
  const theDate = date instanceof dayjs ? (date as Dayjs).toDate() : (date as Date);
  return Intl.DateTimeFormat(locale, options).format(theDate);
};

/**
 * Returns a localized and translated calendar day based on the
 * given Date object and locale. Undefined values mean the defaults
 * associated with the browser's current locale will be used.
 */
export const formatToLocalizedDate = (
  date: Date | Dayjs,
  locale: string | undefined = undefined,
  dateStyle: Intl.DateTimeFormatOptions["dateStyle"] = "long"
) => formatLocalizedDateTime(date, { dateStyle }, locale);

/**
 * Returns a localized and translated time of day based on the
 * given Date object and locale. Undefined values mean the defaults
 * associated with the browser's current locale will be used.
 */
export const formatToLocalizedTime = (
  date: Date | Dayjs,
  locale: string | undefined = undefined,
  timeStyle: Intl.DateTimeFormatOptions["timeStyle"] = "short",
  hour12: Intl.DateTimeFormatOptions["hour12"] = undefined
) => formatLocalizedDateTime(date, { timeStyle, hour12 }, locale);

/**
 * Returns a translated timezone based on the given Date object and
 * locale. Undefined values mean the browser's current locale
 * will be used.
 */
export const formatToLocalizedTimezone = (
  date: Date | Dayjs,
  locale: string | undefined = undefined,
  timeZoneName: Intl.DateTimeFormatOptions["timeZoneName"] = "long"
) => {
  // Intl.DateTimeFormat doesn't format into a timezone only, so we must
  //  formatToParts() and return the piece we want
  const theDate = date instanceof dayjs ? (date as Dayjs).toDate() : (date as Date);
  return Intl.DateTimeFormat(locale, { timeZoneName })
    .formatToParts(theDate)
    .find((d) => d.type == "timeZoneName")?.value;
};

/**
 * Sorts two timezones by their offset from GMT.
 */
export const sortByTimezone = (timezoneA: string, timezoneB: string) => {
  const timezoneAGmtOffset = dayjs.utc().tz(timezoneA).utcOffset();
  const timezoneBGmtOffset = dayjs.utc().tz(timezoneB).utcOffset();

  if (timezoneAGmtOffset === timezoneBGmtOffset) return 0;

  return timezoneAGmtOffset < timezoneBGmtOffset ? -1 : 1;
};

/**
 * Verifies given time is a day before in timezoneB.
 */
export const isPreviousDayInTimezone = (time: string, timezoneA: string, timezoneB: string) => {
  const timeInTimezoneA = formatTime(time, 24, timezoneA);
  const timeInTimezoneB = formatTime(time, 24, timezoneB);
  if (time === timeInTimezoneB) return false;

  // Eg timeInTimezoneA = 12:00 and timeInTimezoneB = 23:00
  const hoursTimezoneBIsLater = timeInTimezoneB.localeCompare(timeInTimezoneA) === 1;
  // If it is 23:00, does timezoneA come before or after timezoneB in GMT?
  const timezoneBIsEarlierTimezone = sortByTimezone(timezoneA, timezoneB) === 1;
  return hoursTimezoneBIsLater && timezoneBIsEarlierTimezone;
};

/**
 * Verifies given time is a day after in timezoneB.
 */
export const isNextDayInTimezone = (time: string, timezoneA: string, timezoneB: string) => {
  const timeInTimezoneA = formatTime(time, 24, timezoneA);
  const timeInTimezoneB = formatTime(time, 24, timezoneB);
  if (time === timeInTimezoneB) return false;

  // Eg timeInTimezoneA = 12:00 and timeInTimezoneB = 09:00
  const hoursTimezoneBIsEarlier = timeInTimezoneB.localeCompare(timeInTimezoneA) === -1;
  // If it is 09:00, does timezoneA come before or after timezoneB in GMT?
  const timezoneBIsLaterTimezone = sortByTimezone(timezoneA, timezoneB) === -1;
  return hoursTimezoneBIsEarlier && timezoneBIsLaterTimezone;
};
