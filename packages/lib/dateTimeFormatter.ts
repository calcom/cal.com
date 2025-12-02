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

// Unified date/time formatter with Intl-first + dayjs-fallback
export function formatDateTime(date: Date, options: DateTimeFormatOptions): string {
  const { locale, timeZone, dateStyle, timeStyle, month, hour12 } = options;
  const supported = Intl.DateTimeFormat.supportedLocalesOf([locale]);

  if (supported.length > 0) {
    const intlOptions: Intl.DateTimeFormatOptions = {
      ...(timeZone && { timeZone }),
      ...(dateStyle && { dateStyle }),
      ...(timeStyle && { timeStyle }),
      ...(month && { month }),
      ...(hour12 !== undefined && { hour12 }),
    };
    return new Intl.DateTimeFormat(locale, intlOptions).format(date);
  }
  return formatWithDayjs(date, options);
}

// Format date range
export function formatDateTimeRange(startDate: Date, endDate: Date, options: DateTimeFormatOptions): string {
  const { locale } = options;
  const supported = Intl.DateTimeFormat.supportedLocalesOf([locale]);

  if (supported.length > 0) {
    const intlOptions: Intl.DateTimeFormatOptions = {
      ...(options.timeZone && { timeZone: options.timeZone }),
      ...(options.dateStyle && { dateStyle: options.dateStyle }),
      ...(options.timeStyle && { timeStyle: options.timeStyle }),
      ...(options.hour12 !== undefined && { hour12: options.hour12 }),
    };
    return new Intl.DateTimeFormat(locale, intlOptions).formatRange(startDate, endDate);
  }

  const start = formatWithDayjs(startDate, options);
  const end = formatWithDayjs(endDate, options);
  return `${start} — ${end}`;
}

// Format weekday name
export function formatWeekday(locale: string, day: number, format: "short" | "long"): string {
  const formatMap = { short: "ddd", long: "dddd" };
  return dayjs().day(day).locale(locale).format(formatMap[format]);
}

// Get array of weekday names
export function getWeekdayNames(
  locale: string,
  weekStart: number = 0,
  format: "short" | "long" = "long"
): string[] {
  return Array(7)
    .fill(null)
    .map((_, i) => formatWeekday(locale, (i + weekStart) % 7, format));
}

// Dayjs formatting for locales not supported by Intl (is, lt, nb)
function formatWithDayjs(date: Date, options: DateTimeFormatOptions): string {
  const { locale, dateStyle, timeStyle, month, hour12 } = options;
  const dayjsDate = dayjs(date).locale(locale);

  if (month) {
    const monthFormats = {
      long: "MMMM",
      short: "MMM",
      numeric: "M",
      "2-digit": "MM",
      narrow: "MMM",
    } as const;
    const formatted = dayjsDate.format(monthFormats[month] || "MMM");
    return month === "narrow" ? formatted.charAt(0) : formatted;
  }

  const parts: string[] = [];

  if (dateStyle) {
    const dateFormats = {
      full: "dddd, MMMM D, YYYY",
      long: "MMMM D, YYYY",
      medium: "MMM D, YYYY",
      short: "M/D/YY",
    } as const;
    parts.push(dateFormats[dateStyle]);
  }

  if (timeStyle) {
    parts.push(hour12 ? "h:mm A" : "HH:mm");
  }
  return dayjsDate.format(parts.join(" ") || "YYYY-MM-DD HH:mm");
}
