import {
  format as dateFnsFormat,
  addMilliseconds,
  addSeconds,
  addMinutes,
  addHours,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  startOfDay,
  startOfWeek,
  startOfMonth,
  startOfYear,
  startOfHour,
  startOfMinute,
  endOfDay,
  endOfWeek,
  endOfMonth,
  endOfYear,
  endOfHour,
  endOfMinute,
  isBefore,
  isAfter,
  max,
  min,
  isValid,
  isSameDay,
  isSameHour,
  isSameMinute,
  differenceInMilliseconds,
  differenceInSeconds,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  differenceInYears,
  getDay,
  getHours,
  getMinutes,
  getSeconds,
  getYear,
  getMonth,
} from "date-fns";
import { getTimezoneOffset } from "date-fns-tz";
import { z } from "zod";

export type DateFnsDate = Date;

export const yyyymmdd = (
  date:
    | Date
    | string
    | { toDate?: () => Date; toISOString?: () => string; format?: (format: string) => string }
) => {
  if (typeof date === "string") {
    return dateFnsFormat(new Date(date), "yyyy-MM-dd");
  }

  if (typeof date === "object" && "format" in date && typeof date.format === "function") {
    return date.format("YYYY-MM-DD");
  }

  if (typeof date === "object" && "toISOString" in date && typeof date.toISOString === "function") {
    return date.toISOString().split("T")[0];
  }

  return dateFnsFormat(date as Date, "yyyy-MM-dd");
};

export const daysInMonth = (
  date: Date | string | { year?: () => number; month?: () => number; toDate?: () => Date }
) => {
  if (typeof date === "string") {
    const d = new Date(date);
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  if (
    typeof date === "object" &&
    "year" in date &&
    "month" in date &&
    typeof date.year === "function" &&
    typeof date.month === "function"
  ) {
    return new Date(date.year(), date.month() + 1, 0).getDate();
  }

  if (typeof date === "object" && "toDate" in date && typeof date.toDate === "function") {
    const d = date.toDate();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  }

  const d = date as Date;
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};

export const formatTime = (date: string | Date, timeFormat?: number | null, timeZone?: string | null) => {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  if (timeZone) {
    const options: Intl.DateTimeFormatOptions =
      timeFormat === 12
        ? { hour: "numeric", minute: "2-digit", hour12: true, timeZone }
        : { hour: "2-digit", minute: "2-digit", hour12: false, timeZone };

    return new Intl.DateTimeFormat("en-US", options).format(dateObj);
  }

  const formatStr = timeFormat === 12 ? "h:mm a" : "HH:mm";
  return dateFnsFormat(dateObj, formatStr);
};

export const isSupportedTimeZone = (timeZone: string) => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch (error) {
    return false;
  }
};

export const formatLocalizedDateTime = (
  date: Date,
  options: Intl.DateTimeFormatOptions = {},
  locale: string | undefined = undefined
) => {
  return new Intl.DateTimeFormat(locale, options).format(date);
};

export const formatToLocalizedDate = (
  date: Date,
  locale: string | undefined = undefined,
  dateStyle: Intl.DateTimeFormatOptions["dateStyle"] = "long",
  timeZone?: string
) => formatLocalizedDateTime(date, { dateStyle, timeZone }, locale);

export const formatToLocalizedTime = (
  date: Date,
  locale: string | undefined = undefined,
  timeStyle: Intl.DateTimeFormatOptions["timeStyle"] = "short",
  hour12: Intl.DateTimeFormatOptions["hour12"] = undefined,
  timeZone?: string
) => formatLocalizedDateTime(date, { timeStyle, hour12, timeZone }, locale);

export const formatToLocalizedTimezone = (
  date: Date,
  locale: string | undefined = undefined,
  timeZone: Intl.DateTimeFormatOptions["timeZone"],
  timeZoneName: Intl.DateTimeFormatOptions["timeZoneName"] = "long"
) => {
  return new Intl.DateTimeFormat(locale, { timeZoneName, timeZone })
    .formatToParts(date)
    .find((d) => d.type == "timeZoneName")?.value;
};

export const sortByTimezone = (timezoneA: string, timezoneB: string) => {
  const now = new Date();
  const timezoneAOffset = getTimezoneOffset(timezoneA, now);
  const timezoneBOffset = getTimezoneOffset(timezoneB, now);

  if (timezoneAOffset === timezoneBOffset) return 0;
  return timezoneAOffset < timezoneBOffset ? -1 : 1;
};

export const isPreviousDayInTimezone = (time: string, timezoneA: string, timezoneB: string) => {
  const timeInTimezoneA = formatTime(time, 24, timezoneA);
  const timeInTimezoneB = formatTime(time, 24, timezoneB);
  if (time === timeInTimezoneB) return false;

  const hoursTimezoneBIsLater = timeInTimezoneB.localeCompare(timeInTimezoneA) === 1;
  const timezoneBIsEarlierTimezone = sortByTimezone(timezoneA, timezoneB) === 1;
  return hoursTimezoneBIsLater && timezoneBIsEarlierTimezone;
};

export const isNextDayInTimezone = (time: string, timezoneA: string, timezoneB: string) => {
  const timeInTimezoneA = formatTime(time, 24, timezoneA);
  const timeInTimezoneB = formatTime(time, 24, timezoneB);
  if (time === timeInTimezoneB) return false;

  const hoursTimezoneBIsEarlier = timeInTimezoneB.localeCompare(timeInTimezoneA) === -1;
  const timezoneBIsLaterTimezone = sortByTimezone(timezoneA, timezoneB) === -1;
  return hoursTimezoneBIsEarlier && timezoneBIsLaterTimezone;
};

const weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
export type WeekDays = (typeof weekDays)[number];
type WeekDayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const weekdayToWeekIndex = (weekday: WeekDays | string | number | undefined) => {
  if (typeof weekday === "undefined") return 0;
  if (typeof weekday === "number") return weekday >= 0 && weekday <= 6 ? (weekday as WeekDayIndex) : 0;
  return (weekDays.indexOf(weekday as WeekDays) as WeekDayIndex) || 0;
};

export const timeZoneWithDST = (timeZone: string): boolean => {
  const jan = new Date(`${new Date().getFullYear()}-01-01T00:00:00`);
  const jul = new Date(`${new Date().getFullYear()}-07-01T00:00:00`);

  const janOffset = getTimezoneOffset(timeZone, jan);
  const julOffset = getTimezoneOffset(timeZone, jul);

  return janOffset !== julOffset;
};

export const getDSTDifference = (timeZone: string): number => {
  const jan = new Date(`${new Date().getFullYear()}-01-01T00:00:00`);
  const jul = new Date(`${new Date().getFullYear()}-07-01T00:00:00`);

  const janOffset = getTimezoneOffset(timeZone, jan);
  const julOffset = getTimezoneOffset(timeZone, jul);

  return julOffset - janOffset;
};

export const getUTCOffsetInDST = (timeZone: string) => {
  if (timeZoneWithDST(timeZone)) {
    const jan = new Date(`${new Date().getFullYear()}-01-01T00:00:00`);
    const jul = new Date(`${new Date().getFullYear()}-07-01T00:00:00`);

    const janOffset = getTimezoneOffset(timeZone, jan);
    const julOffset = getTimezoneOffset(timeZone, jul);

    return janOffset < julOffset ? julOffset : janOffset;
  }
  return 0;
};

export const isInDST = (date: Date, timeZone: string) => {
  const offset = getTimezoneOffset(timeZone, date);
  return timeZoneWithDST(timeZone) && offset === getUTCOffsetInDST(timeZone);
};

export function getUTCOffsetByTimezone(timeZone: string, date?: string | Date) {
  if (!timeZone) return null;

  const dateObj = date ? (typeof date === "string" ? new Date(date) : date) : new Date();

  try {
    return getTimezoneOffset(timeZone, dateObj) / 60000; // Convert ms to minutes
  } catch (error) {
    return null;
  }
}

export const stringToDate = (val: string) => {
  const hasTimezone = val.match(/([+-]\d{2}:\d{2}|Z)$/);

  if (hasTimezone) {
    const date = new Date(val);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${val}`);
    }
    return date;
  } else {
    const date = new Date(`${val}Z`);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date string: ${val}`);
    }
    return date;
  }
};

export const stringToDateZod = z.string().transform(stringToDate);

export const addTime = (
  date: Date,
  amount: number,
  unit:
    | "milliseconds"
    | "seconds"
    | "minutes"
    | "hours"
    | "days"
    | "weeks"
    | "months"
    | "years"
    | "year"
    | "month"
    | "week"
    | "day"
    | "hour"
    | "minute"
    | "second"
): Date => {
  switch (unit) {
    case "milliseconds":
      return addMilliseconds(date, amount);
    case "seconds":
    case "second":
      return addSeconds(date, amount);
    case "minutes":
    case "minute":
      return addMinutes(date, amount);
    case "hours":
    case "hour":
      return addHours(date, amount);
    case "days":
    case "day":
      return addDays(date, amount);
    case "weeks":
    case "week":
      return addWeeks(date, amount);
    case "months":
    case "month":
      return addMonths(date, amount);
    case "years":
    case "year":
      return addYears(date, amount);
    default:
      return new Date(date);
  }
};

export const subtractTime = (
  date: Date,
  amount: number,
  unit:
    | "milliseconds"
    | "seconds"
    | "minutes"
    | "hours"
    | "days"
    | "weeks"
    | "months"
    | "years"
    | "year"
    | "month"
    | "week"
    | "day"
    | "hour"
    | "minute"
    | "second"
): Date => {
  return addTime(date, -amount, unit);
};

export const startOf = (date: Date, unit: "day" | "week" | "month" | "year" | "hour" | "minute"): Date => {
  switch (unit) {
    case "day":
      return startOfDay(date);
    case "week":
      return startOfWeek(date);
    case "month":
      return startOfMonth(date);
    case "year":
      return startOfYear(date);
    case "hour":
      return startOfHour(date);
    case "minute":
      return startOfMinute(date);
    default:
      return new Date(date);
  }
};

export const endOf = (date: Date, unit: "day" | "week" | "month" | "year" | "hour" | "minute"): Date => {
  switch (unit) {
    case "day":
      return endOfDay(date);
    case "week":
      return endOfWeek(date);
    case "month":
      return endOfMonth(date);
    case "year":
      return endOfYear(date);
    case "hour":
      return endOfHour(date);
    case "minute":
      return endOfMinute(date);
    default:
      return new Date(date);
  }
};

export { isBefore };

export { isAfter };

export { max };

export { min };

export const utc = (input?: string | Date): Date => {
  if (!input) return new Date();
  if (typeof input === "string") {
    return new Date(input);
  }
  return new Date(input);
};

export const tz = (date: Date, timeZone: string): Date => {
  return utcToZonedTime(date, timeZone);
};

export const format = (date: Date, formatStr?: string): string => {
  if (!formatStr || formatStr === "YYYY-MM-DD") {
    return dateFnsFormat(date, "yyyy-MM-dd");
  }

  if (formatStr === "YYYY-MM-DD HH:mm:ss") {
    return dateFnsFormat(date, "yyyy-MM-dd HH:mm:ss");
  }

  const formatMap: Record<string, string> = {
    YYYY: "yyyy",
    YY: "yy",
    MMMM: "MMMM",
    MMM: "MMM",
    MM: "MM",
    M: "M",
    DD: "dd",
    D: "d",
    HH: "HH",
    H: "H",
    hh: "hh",
    h: "h",
    mm: "mm",
    m: "m",
    ss: "ss",
    s: "s",
    A: "A",
    a: "a",
    Z: "XXX",
    z: "z",
  };

  let dateFnsFormatStr = formatStr;
  Object.entries(formatMap).forEach(([dayjsToken, dateFnsToken]) => {
    dateFnsFormatStr = dateFnsFormatStr.replace(new RegExp(dayjsToken, "g"), dateFnsToken);
  });

  return dateFnsFormat(date, dateFnsFormatStr);
};

export const day = (date: Date): number => {
  return getDay(date);
};

export { isValid };

export const isBetween = (date: Date, start: Date, end: Date, inclusivity = "()"): boolean => {
  const dateTime = date.getTime();
  const startTime = start.getTime();
  const endTime = end.getTime();

  switch (inclusivity) {
    case "[]":
      return dateTime >= startTime && dateTime <= endTime;
    case "[)":
      return dateTime >= startTime && dateTime < endTime;
    case "(]":
      return dateTime > startTime && dateTime <= endTime;
    case "()":
    default:
      return dateTime > startTime && dateTime < endTime;
  }
};

export const isSame = (date1: Date, date2: Date, unit?: string): boolean => {
  if (!unit || unit === "millisecond") {
    return date1.getTime() === date2.getTime();
  }

  switch (unit) {
    case "day":
      return isSameDay(date1, date2);
    case "hour":
      return isSameDay(date1, date2) && getHours(date1) === getHours(date2);
    case "minute":
      return isSameHour(date1, date2) && getMinutes(date1) === getMinutes(date2);
    case "second":
      return isSameMinute(date1, date2) && getSeconds(date1) === getSeconds(date2);
    default:
      return date1.getTime() === date2.getTime();
  }
};

export const hour = (date: Date): number => {
  return getHours(date);
};

export const minute = (date: Date): number => {
  return getMinutes(date);
};

export const formatHHMM = (date: Date): string => {
  return dateFnsFormat(date, "HH:mm");
};

export const second = (date: Date): number => {
  return getSeconds(date);
};

export const year = (date: Date): number => {
  return getYear(date);
};

export const month = (date: Date): number => {
  return getMonth(date);
};

export const valueOf = (date: Date): number => {
  return date.getTime();
};

export const toISOString = (date: Date): string => {
  return date.toISOString();
};

export const toDate = (date: Date): Date => {
  return new Date(date);
};

export const diff = (
  date1: Date,
  date2: Date,
  unit: "year" | "month" | "week" | "day" | "hour" | "minute" | "second" | "millisecond"
) => {
  switch (unit) {
    case "year":
      return differenceInYears(date1, date2);
    case "month":
      return differenceInMonths(date1, date2);
    case "week":
      return differenceInWeeks(date1, date2);
    case "day":
      return differenceInDays(date1, date2);
    case "hour":
      return differenceInHours(date1, date2);
    case "minute":
      return differenceInMinutes(date1, date2);
    case "second":
      return differenceInSeconds(date1, date2);
    case "millisecond":
    default:
      return differenceInMilliseconds(date1, date2);
  }
};
