import dayjs, { Dayjs } from "@calcom/dayjs";

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

const getAvailability = ({
  timeZone,
  availability,
  dateFrom,
  dateTo,
}: {
  timeZone?: string;
  availability: { startTime: Date; endTime: Date; date: Date | null; days: number[] }[];
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
          block.startTime.getUTCHours() * 60 + block.startTime.getUTCMinutes(),
          "minutes"
        );
        if (block.days?.includes(startDate.day())) {
          dates[startDate.format("YYYY-MM-DD")] = dates[startDate.format("YYYY-MM-DD")] ?? [];
          dates[startDate.format("YYYY-MM-DD")].push({
            start: startDate,
            end: (timeZone ? date.tz(timeZone, true) : date).add(
              block.endTime.getUTCHours() * 60 + block.endTime.getUTCMinutes(),
              "minutes"
            ),
          });
        }
      }
      return dates;
    }, {} as Record<string, { start: Dayjs; end: Dayjs }[]>);

  const dateOverrides = availability
    .filter((availability) => !!availability.date)
    .reduce((dates, override) => {
      const start = (timeZone ? dayjs.tz(override.date, timeZone) : dayjs.utc(override.date))
        .hour(override.startTime.getUTCHours())
        .minute(override.startTime.getUTCMinutes());

      dates[start.format("YYYY-MM-DD")] = dates[start.format("YYYY-MM-DD")] ?? [];
      dates[start.format("YYYY-MM-DD")].push({
        start,
        end: (timeZone ? dayjs.tz(override.date, timeZone) : dayjs.utc(override.date))
          .hour(override.endTime.getUTCHours())
          .minute(override.endTime.getUTCMinutes()),
      });
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
