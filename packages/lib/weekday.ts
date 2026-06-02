import { formatWeekday, getWeekdayNames, isPersianCalendarLocale } from "./dateTimeFormatter";

type WeekdayFormat = "short" | "long";

const SATURDAY = 6;
const SUNDAY = 0;

/**
 * Default first day of the week for a locale when the user has not set one explicitly.
 * Persian (Shamsi) calendars start the week on Saturday; everything else defaults to Sunday.
 */
export function getWeekStartForLocale(locale: string | string[] | undefined): 0 | 6 {
  const normalizedLocale = Array.isArray(locale) ? locale[0] : locale || "en";
  return isPersianCalendarLocale(normalizedLocale) ? SATURDAY : SUNDAY;
}

export function weekdayNames(locale: string | string[], weekStart = 0, format: WeekdayFormat = "long") {
  const normalizedLocale = Array.isArray(locale) ? locale[0] : locale || "en";
  return getWeekdayNames(normalizedLocale, weekStart, format);
}

export function nameOfDay(
  locale: string | string[] | undefined,
  day: number,
  format: WeekdayFormat = "long"
) {
  const normalizedLocale = Array.isArray(locale) ? locale[0] : locale || "en";
  return formatWeekday(normalizedLocale, day, format);
}
