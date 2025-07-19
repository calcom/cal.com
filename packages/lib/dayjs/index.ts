import { z } from "zod";

import type { DateFnsDate } from "@calcom/lib/dateFns";
import {
  format,
  yyyymmdd as dateFnsYyyymmdd,
  daysInMonth as dateFnsDaysInMonth,
  formatTime as dateFnsFormatTime,
  isSupportedTimeZone,
  formatLocalizedDateTime as dateFnsFormatLocalizedDateTime,
  formatToLocalizedTimezone as dateFnsFormatToLocalizedTimezone,
  sortByTimezone as dateFnsSortByTimezone,
  isPreviousDayInTimezone as dateFnsIsPreviousDayInTimezone,
  isNextDayInTimezone as dateFnsIsNextDayInTimezone,
  weekdayToWeekIndex as dateFnsWeekdayToWeekIndex,
  timeZoneWithDST as dateFnsTimeZoneWithDST,
  getDSTDifference as dateFnsGetDSTDifference,
  getUTCOffsetInDST as dateFnsGetUTCOffsetInDST,
  isInDST as dateFnsIsInDST,
  getUTCOffsetByTimezone as dateFnsGetUTCOffsetByTimezone,
  stringToDate,
} from "@calcom/lib/dateFns";

export const yyyymmdd = (
  date?:
    | string
    | Date
    | DateFnsDate
    | { toDate?: () => Date; toISOString?: () => string; format?: (format: string) => string }
) => {
  return dateFnsYyyymmdd(date || new Date());
};

export const daysInMonth = (
  date?: string | Date | DateFnsDate | { year?: () => number; month?: () => number; toDate?: () => Date }
) => {
  return dateFnsDaysInMonth(date || new Date());
};

/**
 * Expects timeFormat to be either 12 or 24, if null or undefined
 * is passed in, we always default back to 24 hour notation.
 */
export const formatTime = (
  date: string | Date | DateFnsDate,
  timeFormat?: number | null,
  timeZone?: string | null
) => {
  return dateFnsFormatTime(date, timeFormat, timeZone);
};

/**
 * Checks if a provided timeZone string is recognized as a valid timezone by dayjs.
 *
 * @param {string} timeZone - The timezone string to be verified.
 * @returns {boolean} - Returns 'true' if the provided timezone string is recognized as a valid timezone by dayjs. Otherwise, returns 'false'.
 *
 */
export { isSupportedTimeZone };

/**
 * Returns a localized and translated date or time, based on the native
 * Intl.DateTimeFormat available to JS. Undefined values mean the browser's
 * locale will be used.
 */
export const formatLocalizedDateTime = (
  date: Date | DateFnsDate | { toDate?: () => Date },
  options: Intl.DateTimeFormatOptions = {},
  locale: string | undefined = undefined
) => {
  const dateObj =
    typeof date === "object" && "toDate" in date && typeof date.toDate === "function"
      ? date.toDate()
      : (date as Date);
  return dateFnsFormatLocalizedDateTime(dateObj, options, locale);
};

/**
 * Returns a localized and translated calendar day based on the
 * given Date object and locale. Undefined values mean the defaults
 * associated with the browser's current locale will be used.
 */
export const formatToLocalizedDate = (
  date: Date | DateFnsDate | { toDate?: () => Date },
  locale: string | undefined = undefined,
  dateStyle: Intl.DateTimeFormatOptions["dateStyle"] = "long",
  timeZone?: string
) => {
  const dateObj =
    typeof date === "object" && "toDate" in date && typeof date.toDate === "function"
      ? date.toDate()
      : (date as Date);
  return formatLocalizedDateTime(dateObj, { dateStyle, timeZone }, locale);
};

/**
 * Returns a localized and translated time of day based on the
 * given Date object and locale. Undefined values mean the defaults
 * associated with the browser's current locale will be used.
 */
export const formatToLocalizedTime = (
  date: Date | DateFnsDate | { toDate?: () => Date },
  locale: string | undefined = undefined,
  timeStyle: Intl.DateTimeFormatOptions["timeStyle"] = "short",
  hour12: Intl.DateTimeFormatOptions["hour12"] = undefined,
  timeZone?: string
) => {
  const dateObj =
    typeof date === "object" && "toDate" in date && typeof date.toDate === "function"
      ? date.toDate()
      : (date as Date);
  return formatLocalizedDateTime(dateObj, { timeStyle, hour12, timeZone }, locale);
};

/**
 * Returns a translated timezone based on the given Date object and
 * locale. Undefined values mean the browser's current locale
 * will be used.
 */
export const formatToLocalizedTimezone = (
  date: Date | DateFnsDate | { toDate?: () => Date },
  locale: string | undefined = undefined,
  timeZone: Intl.DateTimeFormatOptions["timeZone"],
  timeZoneName: Intl.DateTimeFormatOptions["timeZoneName"] = "long"
) => {
  const dateObj =
    typeof date === "object" && "toDate" in date && typeof date.toDate === "function"
      ? date.toDate()
      : (date as Date);
  return dateFnsFormatToLocalizedTimezone(dateObj, locale, timeZone, timeZoneName);
};

/**
 * Sorts two timezones by their offset from GMT.
 */
export const sortByTimezone = (timezoneA: string, timezoneB: string) => {
  return dateFnsSortByTimezone(timezoneA, timezoneB);
};

/**
 * Verifies given time is a day before in timezoneB.
 */
export const isPreviousDayInTimezone = (time: string, timezoneA: string, timezoneB: string) => {
  return dateFnsIsPreviousDayInTimezone(time, timezoneA, timezoneB);
};

/**
 * Verifies given time is a day after in timezoneB.
 */
export const isNextDayInTimezone = (time: string, timezoneA: string, timezoneB: string) => {
  return dateFnsIsNextDayInTimezone(time, timezoneA, timezoneB);
};

const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type WeekDays = (typeof weekDays)[number];
type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Turns weekday string (eg "Monday") into a number (eg 1).
 * Also accepts a number as parameter (and straight returns that), and accepts
 * undefined as a parameter; returns 0 in that case.
 */
export const weekdayToWeekIndex = (weekday: WeekDays | string | number | undefined) => {
  return dateFnsWeekdayToWeekIndex(weekday);
};

/**
 * Dayjs does not expose the timeZone value publicly through .get("timeZone")
 * instead, we as devs are required to somewhat hack our way to get the
 * tz value as string
 * @param date Dayjs
 * @returns Time Zone name
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getTimeZone = (date?: string | Date | DateFnsDate) => {
  const dateObj = new Date(date || new Date());
  const offset = -dateObj.getTimezoneOffset();
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  const sign = offset >= 0 ? "+" : "-";
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

/**
 * Verify if timeZone has Daylight Saving Time (DST).
 *
 * Many countries in the Northern Hemisphere. Daylight Saving Time usually starts in March-April and ends in
 * September-November when the countries return to standard time, or winter time as it is also known.
 *
 * In the Southern Hemisphere (south of the equator) the participating countries usually start the DST period
 * in September-November and end DST in March-April.
 *
 * @param timeZone Time Zone Name (Ex. America/Mazatlan)
 * @returns boolean
 */
export const timeZoneWithDST = (timeZone: string): boolean => {
  return dateFnsTimeZoneWithDST(timeZone);
};

/**
 * Get DST difference.
 * Today clocks are almost always set one hour back or ahead.
 * However, on Lord Howe Island, Australia, clocks are set only 30 minutes forward
 * from LHST (UTC+10:30) to LHDT (UTC+11) during DST.
 * @param timeZone Time Zone Name (Ex. America/Mazatlan)
 * @returns minutes
 */
export const getDSTDifference = (timeZone: string): number => {
  return dateFnsGetDSTDifference(timeZone);
};

/**
 * Get UTC offset of given time zone when in DST
 * @param timeZone Time Zone Name (Ex. America/Mazatlan)
 * @returns minutes
 */
export const getUTCOffsetInDST = (timeZone: string) => {
  return dateFnsGetUTCOffsetInDST(timeZone);
};
/**
 * Verifies if given time zone is in DST
 * @param date
 * @returns
 */
export const isInDST = (date: Date | DateFnsDate, timeZone: string) => {
  return dateFnsIsInDST(date, timeZone);
};

/**
 * Get UTC offset of given time zone
 * @param timeZone Time Zone Name (Ex. America/Mazatlan)
 * @param date
 * @returns
 */
export function getUTCOffsetByTimezone(timeZone: string, date?: string | Date | DateFnsDate) {
  return dateFnsGetUTCOffsetByTimezone(timeZone, date);
}

/**
 * Converts a string into a dayjs-compatible object with the timezone set.
 */
export const stringToDayjs = (val: string) => {
  const date = stringToDate(val);

  const timezoneMatch = val.match(/([+-]\d{2}:\d{2}|Z)$/);
  const hasTimezone = timezoneMatch !== null;

  let localYear: number,
    localMonth: number,
    localDate: number,
    localHour: number,
    localMinute: number,
    localSecond: number,
    offsetMinutes: number;

  if (hasTimezone) {
    const dateTimeMatch = val.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
    if (dateTimeMatch) {
      localYear = parseInt(dateTimeMatch[1], 10);
      localMonth = parseInt(dateTimeMatch[2], 10) - 1; // 0-indexed
      localDate = parseInt(dateTimeMatch[3], 10);
      localHour = parseInt(dateTimeMatch[4], 10);
      localMinute = parseInt(dateTimeMatch[5], 10);
      localSecond = parseInt(dateTimeMatch[6], 10);
    }

    const offsetMatch = timezoneMatch[1];
    if (offsetMatch === "Z") {
      offsetMinutes = 0; // UTC
    } else {
      const sign = offsetMatch[0] === "+" ? 1 : -1;
      const hours = parseInt(offsetMatch.slice(1, 3), 10);
      const minutes = parseInt(offsetMatch.slice(4, 6), 10);
      offsetMinutes = sign * (hours * 60 + minutes);
    }
  } else {
    localYear = date.getUTCFullYear();
    localMonth = date.getUTCMonth();
    localDate = date.getUTCDate();
    localHour = date.getUTCHours();
    localMinute = date.getUTCMinutes();
    localSecond = date.getUTCSeconds();
    offsetMinutes = 0;
  }

  return {
    toISOString: () => date.toISOString(),
    year: () => localYear,
    month: () => localMonth, // 0-indexed like Dayjs
    date: () => localDate,
    hour: () => localHour,
    minute: () => localMinute,
    second: () => localSecond,
    utcOffset: () => offsetMinutes, // Dayjs returns offset in minutes
    toDate: () => new Date(date),
    format: (formatStr?: string) => format(date, formatStr),
    isValid: () => !isNaN(date.getTime()),
    valueOf: () => date.getTime(),
    _date: date, // Internal access to the Date object
  };
};

export const stringToDayjsZod = z.string().transform(stringToDayjs);
