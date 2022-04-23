import dayjs, { Dayjs } from "dayjs";
import { I18n } from "next-i18next";
import { RRule } from "rrule";

import { RecurringEvent } from "@calcom/types/Calendar";

import { detectBrowserTimeFormat } from "@lib/timeFormat";

import { parseZone } from "./parseZone";

const processDate = (date: string | null | Dayjs, i18n: I18n) => {
  const parsedZone = parseZone(date);
  if (!parsedZone?.isValid()) return "Invalid date";
  const formattedTime = parsedZone?.format(detectBrowserTimeFormat);
  return formattedTime + ", " + dayjs(date).toDate().toLocaleString(i18n.language, { dateStyle: "full" });
};

export const parseDate = (
  date: string | null | Dayjs,
  i18n: I18n,
  recurringEvent?: RecurringEvent,
  recurringCount?: number
): string[] => {
  if (!date) return ["No date"];
  if (!recurringEvent) {
    return [processDate(date, i18n)];
  } else {
    if (!recurringCount) return ["No occurances"];
    const { count, ...restRecurringEvent } = recurringEvent;
    const rule = new RRule({ ...restRecurringEvent, count: recurringCount, dtstart: dayjs(date).toDate() });
    return rule.all().map((r) => {
      return processDate(dayjs(r), i18n);
    });
  }
};
