import type { DateFnsDate } from "@calcom/lib/dateFns";
import {
  addTime,
  subtractTime,
  startOf,
  isBefore,
  isAfter,
  format,
  toISOString,
  utc,
  tz,
  valueOf,
  minute,
} from "@calcom/lib/dateFns";
import type { IFromUser, IOutOfOfficeData, IToUser } from "@calcom/lib/getUserAvailability";
import { withReporting } from "@calcom/lib/sentryWrapper";

import type { DateRange } from "./date-ranges";

export type GetSlots = {
  inviteeDate: DateFnsDate;
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
  // keep the old safeguards in; may be needed.
  frequency = minimumOfOne(frequency);
  eventLength = minimumOfOne(eventLength);
  offsetStart = offsetStart ? minimumOfOne(offsetStart) : 0;

  const orderedDateRanges = dateRanges.sort((a, b) => valueOf(a.start) - valueOf(b.start));

  // there can only ever be one slot at a given start time, and based on duration also only a single length.
  const slots = new Map<
    string,
    {
      time: DateFnsDate;
      userIds?: number[];
      away?: boolean;
      fromUser?: IFromUser;
      toUser?: IToUser;
      reason?: string;
      emoji?: string;
    }
  >();

  let interval = Number(process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL) || 1;
  const intervalsWithDefinedStartTimes = [60, 30, 20, 15, 10, 5];

  for (let i = 0; i < intervalsWithDefinedStartTimes.length; i++) {
    if (frequency % intervalsWithDefinedStartTimes[i] === 0) {
      interval = intervalsWithDefinedStartTimes[i];
      break;
    }
  }

  const startTimeWithMinNotice = addTime(utc(), minimumBookingNotice, "minutes");

  const slotBoundaries = new Map<number, true>();

  orderedDateRanges.forEach((range) => {
    const dateYYYYMMDD = format(range.start, "yyyy-MM-dd");

    let slotStartTime = isAfter(utc(range.start), startTimeWithMinNotice)
      ? range.start
      : startTimeWithMinNotice;

    slotStartTime =
      minute(slotStartTime) % interval !== 0
        ? addTime(
            startOf(slotStartTime, "hour"),
            Math.ceil(minute(slotStartTime) / interval) * interval,
            "minutes"
          )
        : slotStartTime;

    slotStartTime = tz(addTime(slotStartTime, offsetStart ?? 0, "minutes"), timeZone);

    // Find the nearest appropriate slot boundary if this time falls within an existing slot
    const slotBoundariesValueArray = Array.from(slotBoundaries.keys());
    if (slotBoundariesValueArray.length > 0) {
      slotBoundariesValueArray.sort((a, b) => a - b);

      let prevBoundary = null;
      for (let i = slotBoundariesValueArray.length - 1; i >= 0; i--) {
        if (slotBoundariesValueArray[i] < valueOf(slotStartTime)) {
          prevBoundary = slotBoundariesValueArray[i];
          break;
        }
      }

      if (prevBoundary) {
        const prevBoundaryEnd = addTime(new Date(prevBoundary), frequency + (offsetStart ?? 0), "minutes");
        if (isAfter(prevBoundaryEnd, slotStartTime)) {
          const datePrevBoundary = new Date(prevBoundary);
          if (!isBefore(datePrevBoundary, range.start)) {
            slotStartTime = datePrevBoundary;
          } else {
            slotStartTime = prevBoundaryEnd;
          }
          slotStartTime = tz(slotStartTime, timeZone);
        }
      }
    }

    while (
      !isAfter(utc(subtractTime(addTime(slotStartTime, eventLength, "minutes"), 1, "seconds")), range.end)
    ) {
      const slotKey = toISOString(slotStartTime);
      if (slots.has(slotKey)) {
        slotStartTime = addTime(slotStartTime, frequency + (offsetStart ?? 0), "minutes");
        continue;
      }

      slotBoundaries.set(valueOf(slotStartTime), true);

      const dateOutOfOfficeExists = datesOutOfOffice?.[dateYYYYMMDD];
      let slotData: {
        time: DateFnsDate;
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
      slotStartTime = addTime(slotStartTime, frequency + (offsetStart ?? 0), "minutes");
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
  time: DateFnsDate;
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
    timeZone: "UTC",
    minimumBookingNotice,
    offsetStart,
    datesOutOfOffice,
  });
};

export default withReporting(getSlots, "getSlots");
