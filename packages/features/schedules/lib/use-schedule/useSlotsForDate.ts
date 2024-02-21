import { useMemo } from "react";

import type { IFromUser, IOutOfOfficeData, IToUser } from "@calcom/core/getUserAvailability";

import type { Slots } from "./types";

/**
 * Get's slots for a specific date from the schedul cache.
 * @param date Format YYYY-MM-DD
 * @param scheduleCache Instance of useScheduleWithCache
 */

export const useSlotsForDate = (date: string | null, slots?: Slots) => {
  const slotsForDate = useMemo(() => {
    if (!date || typeof slots === "undefined") return [];
    return slots[date] || [];
  }, [date, slots]);

  return slotsForDate;
};

export const useSlotsForAvailableDates = (
  dates: string[] | null,
  slots?: Slots,
  datesOutOfOffice?: IOutOfOfficeData
): {
  slots: { time: string; attendees?: number | undefined; bookingUid?: string | undefined }[];
  date: string | null;
  away: boolean;
  toUser?: IToUser | null;
  fromUser?: IFromUser | null;
  returnDate: string | null;
}[] => {
  const slotsForDates = useMemo(() => {
    let datesCopy = !!dates ? dates.slice() : [];
    // first remove datesOutOfOffice that don't have toUser
    const datesOOOKeys = datesOutOfOffice !== undefined ? Object.keys(datesOutOfOffice) : [];
    const filteredOOOKeys: string[] = [];
    if (datesOutOfOffice) {
      datesOOOKeys.forEach((date) => {
        if (datesOutOfOffice[date]?.toUser?.id) {
          filteredOOOKeys.push(date);
        }
      });
    }

    if (slots === undefined && filteredOOOKeys && filteredOOOKeys.length === 0) return [];

    // Add datesOOOKeys to dates array
    datesCopy = datesCopy.concat(filteredOOOKeys);
    // sort dates
    datesCopy.sort((a, b) => (a === null ? 1 : b === null ? -1 : a.localeCompare(b)));

    return datesCopy
      .filter((date) => date !== null)
      .map((date) => {
        if (date === null)
          return {
            slots: [] as { time: string; attendees?: number | undefined; bookingUid?: string | undefined }[],
            date: null,
            away: false,
            toUser: null,
            returnDate: null,
          };
        const datesOOOExists = datesOutOfOffice !== undefined && datesOutOfOffice[date] !== undefined;
        return {
          slots: slots?.hasOwnProperty(date)
            ? slots[date]
            : ([] as { time: string; attendees?: number | undefined; bookingUid?: string | undefined }[]),
          date,
          away: !!datesOOOExists,
          toUser: !!datesOOOExists ? datesOutOfOffice[date].toUser : null,
          fromUser: !!datesOOOExists ? datesOutOfOffice[date].user : null,
          // @TODO: Remove this when we have a proper return date
          returnDate: !!datesOOOExists ? "Demo Return Date" : null,
        };
      });
  }, [dates, slots]);

  return slotsForDates;
};
