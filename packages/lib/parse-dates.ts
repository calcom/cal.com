import { RRule } from "rrule";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { detectBrowserTimeFormat, TimeFormat } from "@calcom/lib/timeFormat";
import type { RecurringEvent } from "@calcom/types/Calendar";

import { parseZone } from "./parse-zone";

const processDate = (date: string | null | Dayjs, language: string, withDefaultTimeFormat: boolean) => {
  const parsedZone = parseZone(date);
  if (!parsedZone?.isValid()) return "Invalid date";
  const formattedTime = parsedZone?.format(
    withDefaultTimeFormat ? TimeFormat.TWELVE_HOUR : detectBrowserTimeFormat
  );
  return formattedTime + ", " + dayjs(date).toDate().toLocaleString(language, { dateStyle: "full" });
};

export const parseDate = (date: string | null | Dayjs, language: string, withDefaultTimeFormat: boolean) => {
  if (!date) return ["No date"];
  return processDate(date, language, withDefaultTimeFormat);
};

export const parseRecurringDates = (
  {
    startDate,
    timeZone,
    recurringEvent,
    recurringCount,
    withDefaultTimeFormat,
  }: {
    startDate: string | null | Dayjs;
    timeZone?: string;
    recurringEvent: RecurringEvent | null;
    recurringCount: number;
    withDefaultTimeFormat: boolean;
  },
  language: string
): [string[], Date[]] => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, ...restRecurringEvent } = recurringEvent || {};
  const rule = new RRule({
    ...restRecurringEvent,
    count: recurringCount,
    dtstart: new Date(dayjs(startDate).valueOf()),
  });

  const startUtcOffset = dayjs(startDate).utcOffset();
  // UTC still need to have DST applied, rrule does not do this.
  const times = rule.all().map((t) => {
    // applying the DST offset.
    return dayjs.utc(t).add(startUtcOffset - dayjs(t).utcOffset(), "minute");
  });
  const dateStrings = times.map((t) => {
    // finally; show in local timeZone again
    return processDate(t.tz(timeZone), language, withDefaultTimeFormat);
  });

  return [dateStrings, times.map((t) => t.toDate())];
};
