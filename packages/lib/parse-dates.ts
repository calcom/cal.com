import { RRule } from "rrule";

import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import { detectBrowserTimeFormat, TimeFormat } from "@calcom/lib/timeFormat";
import type { RecurringEvent } from "@calcom/types/Calendar";

import { parseZone } from "./parse-zone";

type ExtraOptions = { withDefaultTimeFormat?: boolean; selectedTimeFormat?: TimeFormat };

const processDate = (date: string | null | Dayjs, language: string, options?: ExtraOptions) => {
  const parsedZone = parseZone(date);
  if (!parsedZone?.isValid()) return "Invalid date";
  const formattedTime = parsedZone?.format(
    options?.withDefaultTimeFormat
      ? TimeFormat.TWELVE_HOUR
      : options?.selectedTimeFormat || detectBrowserTimeFormat
  );
  return formattedTime + ", " + dayjs(date).toDate().toLocaleString(language, { dateStyle: "full" });
};

export const parseDate = (date: string | null | Dayjs, language: string, options?: ExtraOptions) => {
  if (!date) return ["No date"];
  return processDate(date, language, options);
};

export const parseDateTimeWithTimeZone = (date: Date, language: string, timezone: string) => {
  const newDate = new Date(date);

  const timeOptions: Object = {
    timeZone: timezone,
    hour12: true,
    hourCycle: 'h12',
    hour: 'numeric',
    minute: 'numeric',
  };

  const dateOptions: Object = {
    timeZone: timezone, 
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };

  const formatedTime = newDate.toLocaleTimeString(language, timeOptions).replace(" ", "").toLowerCase();
  const formatedDate = newDate.toLocaleDateString(language, dateOptions);
  return formatedTime + ", " + formatedDate;
}

export const parseRecurringDates = (
  {
    startDate,
    timeZone,
    recurringEvent,
    recurringCount,
    selectedTimeFormat,
    withDefaultTimeFormat,
  }: {
    startDate: string | null | Dayjs;
    timeZone?: string;
    recurringEvent: RecurringEvent | null;
    recurringCount: number;
    selectedTimeFormat?: TimeFormat;
    withDefaultTimeFormat?: boolean;
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
    return processDate(t.tz(timeZone), language, { selectedTimeFormat, withDefaultTimeFormat });
  });

  return [dateStrings, times.map((t) => t.toDate())];
};
