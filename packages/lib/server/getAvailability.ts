import dayjs, { Dayjs } from "@calcom/dayjs";

import { getWorkingHours } from "../availability";

type RequireOnlyOne<T, Keys extends keyof T = keyof T> = Pick<T, Exclude<keyof T, Keys>> &
  {
    [K in Keys]-?: Required<Pick<T, K>> & Partial<Record<Exclude<Keys, K>, undefined>>;
  }[Keys];

const getAvailability = ({
  timeZone,
  availability,
  dateFrom,
  dateTo,
}: {
  timeZone: string;
  availability: RequireOnlyOne<
    { startTime: Date; endTime: Date; date?: Date; days?: number[] },
    "date" | "days"
  >[];
  dateTo: Date;
  dateFrom: Date;
}) => {
  // TODO evaluate if this can be done smarter
  const workingDates = availability
    .filter((value) => typeof value.days !== "undefined")
    .reduce((dates, block) => {
      for (
        let date = dayjs.utc(dateFrom.toISOString().substring(0, 10));
        date.isBefore(dayjs.utc(dateTo.toISOString()));
        date = date.add(1, "day")
      ) {
        const startDate = date
          .tz(timeZone, true)
          .add(block.startTime.getUTCHours() * 60 + block.startTime.getUTCMinutes(), "minutes");
        if (block.days?.includes(startDate.day())) {
          dates[startDate.format("YYYY-MM-DD")] = dates[startDate.format("YYYY-MM-DD")] ?? [];
          dates[startDate.format("YYYY-MM-DD")].push({
            start: startDate,
            end: date
              .tz(timeZone, true)
              .add(block.endTime.getUTCHours() * 60 + block.endTime.getUTCMinutes(), "minutes"),
          });
        }
      }
      return dates;
    }, {} as Record<string, { start: Dayjs; end: Dayjs }[]>);

  const dateOverrides = availability
    .filter((availability) => !!availability.date)
    .reduce((dates, override) => {
      const start = dayjs
        .tz(override.date, timeZone)
        .hour(override.startTime.getUTCHours())
        .minute(override.startTime.getUTCMinutes());

      dates[start.format("YYYY-MM-DD")] = dates[start.format("YYYY-MM-DD")] ?? [];
      dates[start.format("YYYY-MM-DD")].push({
        start,
        end: dayjs
          .tz(override.date, timeZone)
          .hour(override.endTime.getUTCHours())
          .minute(override.endTime.getUTCMinutes()),
      });
      return dates;
    }, {} as Record<string, { start: Dayjs; end: Dayjs }[]>);

  console.log(workingDates, dateOverrides);

  return Object.values({
    ...workingDates,
    ...dateOverrides,
  });
};

export default getAvailability;
