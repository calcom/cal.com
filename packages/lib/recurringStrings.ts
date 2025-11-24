import type { TFunction } from "i18next";

import { Frequency } from "@calcom/prisma/zod-utils";
import type { RecurringEvent } from "@calcom/types/Calendar";

export const getRecurringFreq = ({
  t,
  recurringEvent,
}: {
  t: TFunction;
  recurringEvent: RecurringEvent;
}): string => {
  if (recurringEvent.interval && recurringEvent.freq >= 0) {
    const parts: string[] = [];

    // Base frequency
    const baseFreq = t("every_for_freq", {
      freq: `${recurringEvent.interval > 1 ? recurringEvent.interval : ""} ${t(
        Frequency[recurringEvent.freq].toString().toLowerCase(),
        {
          count: recurringEvent.interval,
        }
      )}`,
    });
    parts.push(baseFreq);

    // Add byDay information (e.g., "on Monday and Wednesday")
    if (recurringEvent.byDay && recurringEvent.byDay.length > 0) {
      const dayNames = recurringEvent.byDay.map((day) => t(day.toLowerCase())).join(", ");
      parts.push(t("on_days", { days: dayNames }));
    }

    // Add byMonthDay information (e.g., "on the 1st and 15th")
    if (recurringEvent.byMonthDay && recurringEvent.byMonthDay.length > 0) {
      const days = recurringEvent.byMonthDay
        .map((day) => (day < 0 ? t("last_day") : t("day_ordinal", { day })))
        .join(", ");
      parts.push(t("on_month_days", { days }));
    }

    // Add byMonth information (e.g., "in January and June")
    if (recurringEvent.byMonth && recurringEvent.byMonth.length > 0) {
      const months = recurringEvent.byMonth.map((month) => t(`month_${month}`)).join(", ");
      parts.push(t("in_months", { months }));
    }

    // Add bySetPos information (e.g., "first occurrence" or "last occurrence")
    if (recurringEvent.bySetPos && recurringEvent.bySetPos.length > 0) {
      const positions = recurringEvent.bySetPos
        .map((pos) => (pos < 0 ? t("last_occurrence") : t("ordinal_occurrence", { position: pos })))
        .join(", ");
      parts.push(positions);
    }

    return parts.join(" ");
  }
  return "";
};

export const getEveryFreqFor = ({
  t,
  recurringEvent,
  recurringCount,
  recurringFreq,
}: {
  t: TFunction;
  recurringEvent: RecurringEvent;
  recurringCount?: number;
  recurringFreq?: string;
}): string => {
  if (recurringEvent.freq) {
    const parts: string[] = [];

    // Base frequency description
    const baseDescription = `${recurringFreq || getRecurringFreq({ t, recurringEvent })}`;

    // Add count or until information
    if (recurringCount || recurringEvent.count) {
      parts.push(
        `${baseDescription} ${recurringCount || recurringEvent.count} ${t("occurrence", {
          count: recurringCount || recurringEvent.count,
        })}`
      );
    } else if (recurringEvent.until) {
      parts.push(
        `${baseDescription} ${t("until")} ${t("date_format", {
          date: recurringEvent.until,
        })}`
      );
    } else {
      parts.push(baseDescription);
    }

    // // Add exception dates information
    // if (recurringEvent.exDates && recurringEvent.exDates.length > 0) {
    //   parts.push(t("except_dates", { count: recurringEvent.exDates.length }));
    // }

    // // Add additional recurrence dates information
    // if (recurringEvent.rDates && recurringEvent.rDates.length > 0) {
    //   parts.push(t("plus_additional_dates", { count: recurringEvent.rDates.length }));
    // }

    // Add timezone information if not default
    if (recurringEvent.tzid) {
      parts.push(`(${recurringEvent.tzid})`);
    }

    return parts.join(" ");
  }
  return "";
};
