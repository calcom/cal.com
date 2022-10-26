import { I18n } from "next-i18next";
import { RRule } from "rrule";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { detectBrowserTimeFormat } from "@calcom/lib/timeFormat";
import { inferQueryOutput } from "@calcom/trpc/react";
import type { RecurringEvent } from "@calcom/types/Calendar";

import { parseZone } from "./parseZone";

const processDate = (date: string | null | Dayjs, i18n: I18n) => {
  const parsedZone = parseZone(date);
  if (!parsedZone?.isValid()) return "Invalid date";
  const formattedTime = parsedZone?.format(detectBrowserTimeFormat);
  return formattedTime + ", " + dayjs(date).toDate().toLocaleString(i18n.language, { dateStyle: "full" });
};

export const parseDate = (date: string | null | Dayjs, i18n: I18n) => {
  if (!date) return ["No date"];
  return processDate(date, i18n);
};

// tzid is currently broken in rrule library.
// @see https://github.com/jakubroztocil/rrule/issues/523
const dateWithZone = (d: Date, timeZone?: string) => {
  const dateInLocalTZ = new Date(d.toLocaleString("en-US", { timeZone: "UTC" }));
  const dateInTargetTZ = new Date(d.toLocaleString("en-US", { timeZone: timeZone || "UTC" }));
  const tzOffset = dateInTargetTZ.getTime() - dateInLocalTZ.getTime();
  return new Date(d.getTime() - tzOffset);
};

export const parseRecurringDates = (
  {
    startDate,
    timeZone,
    recurringEvent,
    recurringCount,
  }: {
    startDate: string | null | Dayjs;
    timeZone?: string;
    recurringEvent: RecurringEvent | null;
    recurringCount: number;
  },
  i18n: I18n
): [string[], Date[]] => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count, ...restRecurringEvent } = recurringEvent || {};
  const rule = new RRule({
    ...restRecurringEvent,
    count: recurringCount,
    dtstart: dayjs(startDate).utc(true).toDate(),
  });
  // UTC times with tzOffset applied to account for DST
  const times = rule.all().map((t) => dateWithZone(t, timeZone));
  const dateStrings = times.map((t) => {
    // undo DST diffs for localized display.
    return processDate(dayjs.utc(t).tz(timeZone), i18n);
  });

  return [dateStrings, times];
};

export const extractRecurringDates = (
  booking: inferQueryOutput<"viewer.bookings">["bookings"][number] & {
    eventType: { recurringEvent: RecurringEvent | null };
    recurringEventId: string | null;
    recurringBookings: inferQueryOutput<"viewer.bookings">["recurringInfo"];
  },
  timeZone: string | undefined,
  i18n: I18n
): [string[], Date[]] => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { count = 0, ...rest } =
    booking.eventType.recurringEvent !== null ? booking.eventType.recurringEvent : {};
  const recurringInfo = booking.recurringBookings.find(
    (val) => val.recurringEventId === booking.recurringEventId
  );
  const allDates = new RRule({
    ...rest,
    count: recurringInfo?._count.recurringEventId,
    dtstart: recurringInfo?._min.startTime,
  }).all();
  const utcOffset = dayjs(recurringInfo?._min.startTime).tz(timeZone).utcOffset();
  const dateStrings = allDates.map((r) => {
    return processDate(dayjs.utc(r).utcOffset(utcOffset), i18n);
  });
  return [dateStrings, allDates];
};
