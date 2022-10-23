import { I18n } from "next-i18next";

import dayjs, { Dayjs } from "@calcom/dayjs";
import { detectBrowserTimeFormat } from "@calcom/lib/timeFormat";
import { Frequency } from "@calcom/prisma/zod-utils";
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
  const { freq = 2, interval = 1 } = recurringEvent || {};
  const startDatejs = dayjs.utc(startDate);
  const { hours, minutes, seconds } = startDatejs.toObject();
  const recurrence = startDatejs.recur().every(interval, Frequency[freq]);
  const utcOffset = startDatejs.tz(timeZone).utcOffset();
  const allDates = [startDatejs.toDate()].concat(
    recurrence.next(recurringCount - 1).map((dt) => dt.set({ hours, minutes, seconds }).toDate())
  );
  const dateStrings = allDates.map((r) => {
    return processDate(dayjs.utc(r).utcOffset(utcOffset), i18n);
  });
  return [dateStrings, allDates];
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
  const { freq = 2, interval = 1 } =
    booking.eventType.recurringEvent !== null ? booking.eventType.recurringEvent : {};
  const recurringInfo = booking.recurringBookings.find(
    (val) => val.recurringEventId === booking.recurringEventId
  );
  const startDatejs = dayjs.utc(recurringInfo?._min.startTime);
  const { hours, minutes, seconds } = startDatejs.toObject();
  const count = recurringInfo?._count.recurringEventId as number;
  const recurrence = startDatejs.recur().every(interval, Frequency[freq]);
  const utcOffset = startDatejs.tz(timeZone).utcOffset();
  const allDates = [startDatejs.toDate()].concat(
    recurrence.next(count - 1).map((dt) => dt.set({ hours, minutes, seconds }).toDate())
  );
  const dateStrings = allDates.map((r) => {
    return processDate(dayjs.utc(r).utcOffset(utcOffset), i18n);
  });
  return [dateStrings, allDates];
};
