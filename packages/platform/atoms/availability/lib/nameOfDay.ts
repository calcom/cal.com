import type { WeekdayFormat } from "../types";

export function nameOfDay(
  locale: string | string[] | undefined,
  day: number,
  format: WeekdayFormat = "long"
) {
  return new Intl.DateTimeFormat(locale, { weekday: format }).format(new Date(1970, 0, day + 4));
}
