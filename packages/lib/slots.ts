import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { IFromUser, IOutOfOfficeData, IToUser } from "@calcom/lib/getUserAvailability";
import { withReporting } from "@calcom/lib/sentryWrapper";

import type { DateRange } from "./date-ranges";
import { getTimeZone } from "./dayjs";

export type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  dateRanges: DateRange[];
  minimumBookingNotice: number;
  eventLength: number;
  offsetStart?: number;
  datesOutOfOffice?: IOutOfOfficeData;
};

export type TimeFrame = { userIds?: number[]; startTime: number; endTime: number };

const minimumOfOne = (input: number) => (input < 1 ? 1 : input);

function buildSlotsWithDateRanges({
  dateRanges,
  frequency,
  eventLength,
  timeZone,
  minimumBookingNotice,
  offsetStart,
  datesOutOfOffice,
}: {
  dateRanges: DateRange[];
  frequency: number;
  eventLength: number;
  timeZone: string;
  minimumBookingNotice: number;
  offsetStart?: number;
  datesOutOfOffice?: IOutOfOfficeData;
}) {
  frequency = minimumOfOne(frequency);
  eventLength = minimumOfOne(eventLength);
  offsetStart = offsetStart ? minimumOfOne(offsetStart) : 0;

  const orderedDateRanges = dateRanges.sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const slots = new Map<
    string,
    {
      time: Dayjs;
      userIds?: number[];
      away?: boolean;
      fromUser?: IFromUser;
      toUser?: IToUser;
      reason?: string;
      emoji?: string;
    }
  >();

  // Convert UTC minimum notice to local timezone for correct comparison
  const startTimeWithMinNotice = dayjs.utc().add(minimumBookingNotice, "minute").tz(timeZone);

  orderedDateRanges.forEach((range) => {
    const dateYYYYMMDD = range.start.format("YYYY-MM-DD");

    let slotStartTime = range.start.tz(timeZone).add(offsetStart, "minute");

    while (!slotStartTime.add(eventLength, "minute").isAfter(range.end.tz(timeZone))) {
      // Only allow slot if it's after minimum booking time in same timezone
      if (slotStartTime.isBefore(startTimeWithMinNotice)) {
        slotStartTime = slotStartTime.add(frequency, "minute");
        continue;
      }

      const slotKey = slotStartTime.toISOString();
      if (slots.has(slotKey)) {
        slotStartTime = slotStartTime.add(frequency, "minute");
        continue;
      }

      const dateOutOfOfficeExists = datesOutOfOffice?.[dateYYYYMMDD];
      let slotData: {
        time: Dayjs;
        userIds?: number[];
        away?: boolean;
        fromUser?: IFromUser;
        toUser?: IToUser;
        reason?: string;
        emoji?: string;
      } = {
        time: slotStartTime,
      };

      if (dateOutOfOfficeExists) {
        const { toUser, fromUser, reason, emoji } = dateOutOfOfficeExists;
        slotData = {
          time: slotStartTime,
          away: true,
          ...(fromUser && { fromUser }),
          ...(toUser && { toUser }),
          ...(reason && { reason }),
          ...(emoji && { emoji }),
        };
      }

      slots.set(slotKey, slotData);
      slotStartTime = slotStartTime.add(frequency, "minute");
    }
  });

  return Array.from(slots.values());
}

const getSlots = ({
  inviteeDate,
  frequency,
  minimumBookingNotice,
  dateRanges,
  eventLength,
  offsetStart = 0,
  datesOutOfOffice,
}: GetSlots): {
  time: Dayjs;
  userIds?: number[];
  away?: boolean;
  fromUser?: IFromUser;
  toUser?: IToUser;
  reason?: string;
  emoji?: string;
}[] => {
  return buildSlotsWithDateRanges({
    dateRanges,
    frequency,
    eventLength,
    timeZone: getTimeZone(inviteeDate),
    minimumBookingNotice,
    offsetStart,
    datesOutOfOffice,
  });
};

export default withReporting(getSlots, "getSlots");
