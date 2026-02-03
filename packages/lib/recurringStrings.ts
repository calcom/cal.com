import type { TFunction } from "i18next";

import type { RecurringEvent } from "@calcom/types/Calendar";
import type { RecurringEvent } from "@calcom/types/Calendar";

/**
 * Get ordinal suffix for a number (1st, 2nd, 3rd, etc.)
 */
export const getOrdinal = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

/**
 * Map frequency enum to singular form
 */
const FREQ_MAP: Record<number, string> = {
  0: "year",   // YEARLY
  1: "month",  // MONTHLY
  2: "week",   // WEEKLY
  3: "day",    // DAILY
};

/**
 * Generate human-readable frequency text based on freq and interval
 * @param freq - Frequency enum value (0-3)
 * @param interval - Interval value (default: 1)
 * @returns Frequency text like "every day", "every other week", "every 3rd month"
 */
export const getFrequencyText = (freq: number, interval = 1): string => {
  const baseFreq = FREQ_MAP[freq] || "day";

  if (interval === 1) {
    return `every ${baseFreq}`;
  } else if (interval === 2) {
    return `every other ${baseFreq}`;
  } else {
    return `every ${getOrdinal(interval)} ${baseFreq}`;
  }
};

/**
 * Format count text for recurring events
 * @param count - Number of occurrences
 * @returns Formatted text like "for 5 events" or "for 1 event"
 */
export const getCountText = (count: number): string => {
  return `for ${count} ${count === 1 ? "event" : "events"}`;
};

/**
 * Get formatted day names from byDay array
 * @param byDay - Array of day codes (e.g., ["MO", "WE"])
 * @param t - Translation function
 * @returns Comma-separated day names
 */
export const getByDayText = (byDay: string[], t: (key: string) => string): string => {
  const dayNames = byDay.map((day) => t(day.toLowerCase())).join(", ");
  return `on ${dayNames}`;
};

/**
 * Get formatted month day text from byMonthDay array
 * @param byMonthDay - Array of month days (e.g., [1, 15, -1])
 * @returns Formatted text like "on the 1st, 15th, and last day"
 */
export const getByMonthDayText = (byMonthDay: number[]): string => {
  const days = byMonthDay
    .map((day) => (day < 0 ? "last day" : getOrdinal(day)))
    .join(", ");
  return `on the ${days}`;
};

/**
 * Get formatted month names from byMonth array
 * @param byMonth - Array of month numbers (1-12)
 * @param t - Translation function
 * @returns Formatted text like "in January, June"
 */
export const getByMonthText = (byMonth: number[], t: (key: string) => string): string => {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const months = byMonth
    .map((month) => t(`month_${month}`) || monthNames[month - 1])
    .join(", ");
  return `in ${months}`;
};

/**
 * Get formatted position text from bySetPos array
 * @param bySetPos - Array of positions (e.g., [1, -1])
 * @returns Formatted text like "1st occurrence, last occurrence"
 */
export const getBySetPosText = (bySetPos: number[]): string => {
  return bySetPos
    .map((pos) => (pos < 0 ? "last occurrence" : `${getOrdinal(pos)} occurrence`))
    .join(", ");
};


export const getRecurringFreq = ({
  t,
  recurringEvent,
}: {
  t: TFunction;
  recurringEvent: RecurringEvent;
}): string => {
  if (!recurringEvent.interval || recurringEvent.freq < 0) {
    return "";
  }

  const parts: string[] = [];
  const { freq, interval, byDay, byMonthDay, byMonth, bySetPos } = recurringEvent;

  // Base frequency text
  const frequencyText = getFrequencyText(freq, interval);
  parts.push(`${frequencyText.charAt(0).toUpperCase() + frequencyText.slice(1)} for`);

  // Add byDay information (e.g., "on Monday and Wednesday")
  if (byDay && byDay.length > 0) {
    parts.push(getByDayText(byDay, t));
  }

  // Add byMonthDay information (e.g., "on the 1st and 15th")
  if (byMonthDay && byMonthDay.length > 0) {
    parts.push(getByMonthDayText(byMonthDay));
  }

  // Add byMonth information (e.g., "in January and June")
  if (byMonth && byMonth.length > 0) {
    parts.push(getByMonthText(byMonth, t));
  }

  // Add bySetPos information (e.g., "first occurrence" or "last occurrence")
  if (bySetPos && bySetPos.length > 0) {
    parts.push(getBySetPosText(bySetPos));
  }

  return parts.join(" ");
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
