import dayjs from "@calcom/dayjs";

/**
 * Given a list of UTC datetimes and a target timezone, returns a boolean array
 * indicating which occurrences have a *different local start time* (HH:mm)
 * than the first occurrence in that timezone.
 *
 * The first occurrence is always `false` (baseline).
 */
export const getTimeShiftFlags = (options: { dates: (string | Date)[]; timezone: string }): boolean[] => {
  const { dates, timezone } = options;

  if (!dates.length) return [];

  const first = dayjs(dates[0]).tz(timezone);
  const baseHour = first.hour();
  const baseMinute = first.minute();

  return dates.map((date, index) => {
    if (index === 0) return false;

    const d = dayjs(date).tz(timezone);

    return d.hour() !== baseHour || d.minute() !== baseMinute;
  });
};

export default getTimeShiftFlags;
