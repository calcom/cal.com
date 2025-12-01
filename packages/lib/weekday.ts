import dayjs from "@calcom/dayjs";

type WeekdayFormat = "short" | "long";

const WEEKDAY_FORMAT_MAP: Record<WeekdayFormat, string> = {
  short: "ddd",
  long: "dddd",
};

function normalizeLocale(locale: string | string[] | undefined): string | undefined {
  if (!locale) return undefined;

  const raw = Array.isArray(locale) ? locale[0] : locale;
  if (!raw) return undefined;

  const lower = raw.toLowerCase();

  // Normalize some common full locale codes to the Dayjs locale codes
  const map: Record<string, string> = {
    "is-is": "is",
    is: "is",
    "lt-lt": "lt",
    lt: "lt",
    "nb-no": "nb",
    nb: "nb",
  };

  return map[lower] ?? lower;
}

// By default starts on Sunday (Sunday, Monday, Tuesday, Wednesday, Thursday, Friday, Saturday)
export function weekdayNames(locale: string | string[], weekStart = 0, format: WeekdayFormat = "long") {
  return Array(7)
    .fill(null)
    .map((_, index) => nameOfDay(locale, (index + weekStart) % 7, format));
}

export function nameOfDay(
  locale: string | string[] | undefined,
  day: number,
  format: WeekdayFormat = "long"
) {
  const normalizedLocale = normalizeLocale(locale) ?? "en";
  const weekdayFormat = WEEKDAY_FORMAT_MAP[format] ?? WEEKDAY_FORMAT_MAP.long;

  // `day` is 0-6 (Sunday-Saturday). We use a fixed reference week and rely on Dayjs locale formatting.
  return dayjs()
    .day(day)
    .locale(normalizedLocale)
    .format(weekdayFormat);
}
