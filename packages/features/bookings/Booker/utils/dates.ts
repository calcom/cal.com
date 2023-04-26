import dayjs from "@calcom/dayjs";
import type { TimeFormat } from "@calcom/lib/timeFormat";

export const formatEventFromToTime = (
  date: string,
  duration: number | null,
  timeFormat: TimeFormat,
  timeZone: string,
  language: string
) => {
  const start = dayjs(date).tz(timeZone);
  const end = duration ? start.add(duration, "minute") : null;
  return `${start.format("dddd")}, ${start
    .toDate()
    .toLocaleDateString(language, { dateStyle: "long" })} ${start.format(timeFormat)} ${
    end ? `– ${end.format(timeFormat)}` : ``
  }`;
};
