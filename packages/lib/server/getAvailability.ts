import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

const combineConsecutiveBlocks = (blocks: { start: Dayjs; end: Dayjs }[]) => {
  const result = blocks.reduce((acc, date) => {
    if (acc.length > 0 && date.start.diff(acc[acc.length - 1].end, "minutes") <= 1) {
      acc.splice(acc.length - 1, 1, { start: acc[acc.length - 1].start, end: date.end });
    } else {
      acc.push(date);
    }
    return acc;
  }, [] as { start: Dayjs; end: Dayjs }[]);

  return result;
};

const dateMax = (compare: Dayjs, other: Dayjs) => (+compare > +other ? compare : other);
const dateMin = (compare: Dayjs, other: Dayjs) => (+compare < +other ? compare : other);

const getAvailability = ({
  timeZone,
  availability,
  dateFrom,
  dateTo,
}: {
  timeZone?: string;
  availability: { startTime: Date | string; endTime: Date | string; date: Date | null; days: number[] }[];
  dateTo: Date;
  dateFrom: Date;
}) => {
  const workingDates = availability
    .filter((value) => typeof value.days !== "undefined")
    .reduce((dates, block) => {
      for (
        let date = dayjs.utc(dateFrom.toISOString().substring(0, 10));
        date.isBefore(dayjs.utc(dateTo.toISOString()));
        date = date.add(1, "day")
      ) {
        const startDate = (timeZone ? date.tz(timeZone, true) : date).add(
          new Date(block.startTime).getUTCHours() * 60 + new Date(block.startTime).getUTCMinutes(),
          "minutes"
        );
        if (block.days?.includes(startDate.day())) {
          const maxStartDate = dateMax(
            startDate,
            timeZone ? dayjs.utc(dateFrom).tz(timeZone) : dayjs.utc(dateFrom)
          );
          const maxEndDate = dateMin(
            (timeZone ? date.tz(timeZone, true) : date).add(
              new Date(block.endTime).getUTCHours() * 60 + new Date(block.endTime).getUTCMinutes(),
              "minutes"
            ),
            timeZone ? dayjs.utc(dateTo).tz(timeZone) : dayjs.utc(dateTo)
          );

          if (+maxEndDate < +maxStartDate) continue;

          dates[startDate.format("YYYY-MM-DD")] = dates[startDate.format("YYYY-MM-DD")] ?? [];
          dates[startDate.format("YYYY-MM-DD")].push({
            start: maxStartDate,
            end: maxEndDate,
          });
        }
      }
      return dates;
    }, {} as Record<string, { start: Dayjs; end: Dayjs }[]>);

  const dateOverrides = availability
    .filter((availability) => !!availability.date)
    .reduce((dates, override) => {
      const start = (timeZone ? dayjs.tz(override.date, timeZone) : dayjs.utc(override.date))
        .hour(new Date(override.startTime).getUTCHours())
        .minute(new Date(override.startTime).getUTCMinutes());
      // [)
      if (+start < +dateFrom || +start >= +dateTo) {
        return dates;
      }
      const end = (timeZone ? dayjs.tz(override.date, timeZone) : dayjs.utc(override.date))
        .hour(new Date(override.endTime).getUTCHours())
        .minute(new Date(override.endTime).getUTCMinutes());
      // (]
      if (+end <= +dateFrom || +end > +dateTo) {
        return dates;
      }
      dates[start.format("YYYY-MM-DD")] = dates[start.format("YYYY-MM-DD")] ?? [];
      dates[start.format("YYYY-MM-DD")].push({ start, end });
      return dates;
    }, {} as Record<string, { start: Dayjs; end: Dayjs }[]>);
  // All records are keyed by date, this allows easy date overrides.
  const mergeAvailability: Record<string, { start: Dayjs; end: Dayjs }[]> = {
    ...workingDates,
    ...dateOverrides,
  };
  // after merge, the keys are irrelevant so we get the values and flatten the two resulting arrays.
  return combineConsecutiveBlocks(Object.values(mergeAvailability).flat());
};

export default getAvailability;
