import dayjs from "@calcom/dayjs";

type DateTimeStyle = "full" | "long" | "medium" | "short";

interface DateTimeFormatOptions {
  locale: string;
  timeZone?: string;
  dateStyle?: DateTimeStyle;
  timeStyle?: DateTimeStyle;
  month?: "numeric" | "2-digit" | "long" | "short" | "narrow";
  hour12?: boolean;
}

const MAX_FORMATTER_CACHE = 1000;
const MAX_WEEKDAY_CACHE = 500;

const WEEKDAY_FORMATS = { short: "ddd", long: "dddd" } as const;
const MONTH_FORMATS = { long: "MMMM", short: "MMM", numeric: "M", "2-digit": "MM", narrow: "MMM" } as const;
const DATE_FORMATS = {
  full: "dddd, MMMM D, YYYY",
  long: "MMMM D, YYYY",
  medium: "MMM D, YYYY",
  short: "M/D/YY",
} as const;

const localeSupport = new Map<string, boolean>();
const formatterCache = new Map<string, Intl.DateTimeFormat>();
const weekdayCache = new Map<string, string[]>();

function isSupported(locale: string): boolean {
  let supported = localeSupport.get(locale);
  if (supported === undefined) {
    supported = Intl.DateTimeFormat.supportedLocalesOf([locale]).length > 0;
    localeSupport.set(locale, supported);
  }
  return supported;
}

function getFormatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let formatter = formatterCache.get(key);

  if (!formatter) {
    if (formatterCache.size >= MAX_FORMATTER_CACHE) {
      formatterCache.clear();
    }
    formatter = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, formatter);
  }

  return formatter;
}

function buildIntlOptions(options: DateTimeFormatOptions, includeMonth = true): Intl.DateTimeFormatOptions {
  const { timeZone, dateStyle, timeStyle, month, hour12 } = options;
  return {
    ...(timeZone && { timeZone }),
    ...(dateStyle && { dateStyle }),
    ...(timeStyle && { timeStyle }),
    ...(includeMonth && month && { month }),
    ...(hour12 !== undefined && { hour12 }),
  };
}

function formatWithDayjs(date: Date, options: DateTimeFormatOptions): string {
  const { locale, dateStyle, timeStyle, month, hour12, timeZone } = options;
  const dayjsDate = timeZone ? dayjs(date).tz(timeZone).locale(locale) : dayjs(date).locale(locale);

  if (month) {
    const formatted = dayjsDate.format(MONTH_FORMATS[month] || "MMM");
    return month === "narrow" ? formatted.charAt(0) : formatted;
  }

  const parts: string[] = [];
  if (dateStyle) parts.push(DATE_FORMATS[dateStyle]);
  if (timeStyle) parts.push(hour12 ? "h:mm A" : "HH:mm");

  return dayjsDate.format(parts.join(" ") || "YYYY-MM-DD HH:mm");
}

function getDateForWeekday(day: number): Date {
  const today = new Date();
  const diff = day - today.getDay();
  const target = new Date(today);
  target.setDate(today.getDate() + diff);
  return target;
}

export function formatDateTime(date: Date, options: DateTimeFormatOptions): string {
  if (isSupported(options.locale)) {
    return getFormatter(options.locale, buildIntlOptions(options)).format(date);
  }
  return formatWithDayjs(date, options);
}

export function formatDateTimeRange(startDate: Date, endDate: Date, options: DateTimeFormatOptions): string {
  if (isSupported(options.locale)) {
    return getFormatter(options.locale, buildIntlOptions(options, false)).formatRange(startDate, endDate);
  }
  return `${formatWithDayjs(startDate, options)} — ${formatWithDayjs(endDate, options)}`;
}

export function formatWeekday(locale: string, day: number, format: "short" | "long"): string {
  if (isSupported(locale)) {
    return getFormatter(locale, { weekday: format }).format(getDateForWeekday(day));
  }
  return dayjs().day(day).locale(locale).format(WEEKDAY_FORMATS[format]);
}

export function getWeekdayNames(locale: string, weekStart = 0, format: "short" | "long" = "long"): string[] {
  const cacheKey = `${locale}|${weekStart}|${format}`;
  let names = weekdayCache.get(cacheKey);

  if (!names) {
    if (weekdayCache.size >= MAX_WEEKDAY_CACHE) {
      weekdayCache.clear();
    }

    if (isSupported(locale)) {
      const formatter = getFormatter(locale, { weekday: format });
      names = Array.from({ length: 7 }, (_, i) => formatter.format(getDateForWeekday((i + weekStart) % 7)));
    } else {
      names = Array.from({ length: 7 }, (_, i) =>
        dayjs()
          .day((i + weekStart) % 7)
          .locale(locale)
          .format(WEEKDAY_FORMATS[format])
      );
    }
    weekdayCache.set(cacheKey, names);
  }

  return names;
}
