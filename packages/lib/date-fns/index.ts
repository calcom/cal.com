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
export const formatTime = (date: string | Date | Dayjs, timeFormat?: number | null) =>
  dayjs(date).format(timeFormat === 12 ? "h:mma" : "HH:mm");

export const formatTimeInTimezone = (
  date: string | Date | Dayjs,
  timezone: string,
  timeFormat?: number | null
) => formatTime(convertDateToTimezone(date, timezone), timeFormat);

export const convertDateToTimezone = (date: string | Date | Dayjs, timezone: string) =>
  dayjs(date).tz(timezone);
