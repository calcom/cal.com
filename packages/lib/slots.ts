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

export type TimeFrame = {
  userIds?: number[];
  startTime: number;
  endTime: number;
};

const minimumOfOne = (input: number): number => (input < 1 ? 1 : input);

function buildSlotsWithDateRanges({
  dateRanges,
  frequency,
  eventLength,
  timeZone,
  minimumBookingNotice,
  offsetStart = 0,
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
  // Ensure frequency and eventLength have a minimum value of 1
  frequency = minimumOfOne(frequency);
  eventLength = minimumOfOne(eventLength);
  offsetStart = minimumOfOne(offsetStart);

  // Sort date ranges by start time ascending
  const orderedDateRanges = dateRanges.slice().sort((a, b) => a.start.valueOf() - b.start.valueOf());

  // Slots map keyed by ISO string of slot start time
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

  // Determine interval aligned with common start times
  let interval = Number(process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL) || 1;
  const commonIntervals = [60, 30, 20, 15, 10, 5];
  for (const ci of commonIntervals) {
    if (frequency % ci === 0) {
      interval = ci;
      break;
    }
  }

  // Use timezone-aware 'now' for minimum booking notice calculation
  const nowInTimeZone = dayjs().tz(timeZone);
  const earliestStartTime = nowInTimeZone.add(minimumBookingNotice, "minute");

  // Track slot boundaries to avoid overlapping slots
  const slotBoundaries = new Map<number, true>();

  for (const range of orderedDateRanges) {
    const dateKey = range.start.format("YYYY-MM-DD");

    // Start time for slots is max of range start and earliest start time
    let slotStartTime = range.start.isAfter(earliestStartTime) ? range.start : earliestStartTime;

    // Align slotStartTime to interval boundary (round up)
    if (slotStartTime.minute() % interval !== 0) {
      const remainder = slotStartTime.minute() % interval;
      slotStartTime = slotStartTime.add(interval - remainder, "minute");
    }

    // Apply offsetStart as minutes shift
    slotStartTime = slotStartTime.add(offsetStart, "minute").tz(timeZone);

    // Adjust slotStartTime if it overlaps with previous slots
    const sortedBoundaries = Array.from(slotBoundaries.keys()).sort((a, b) => a - b);
    for (let i = sortedBoundaries.length - 1; i >= 0; i--) {
      const boundary = sortedBoundaries[i];
      if (boundary < slotStartTime.valueOf()) {
        const boundaryEnd = dayjs(boundary).add(frequency, "minute");
        if (boundaryEnd.isAfter(slotStartTime)) {
          // If previous boundary end is after proposed start,
          // move start to boundary end ensuring it doesn't go before date range start
          slotStartTime = dayjs.max(boundaryEnd, range.start).tz(timeZone);
        }
        break;
      }
    }

    // Generate slots while end time is within current date range
    while (
      slotStartTime
        .add(eventLength, "minute")
        .subtract(1, "second")
        .isSameOrBefore(range.end)
    ) {
      const slotKey = slotStartTime.toISOString();

      if (slots.has(slotKey)) {
        slotStartTime = slotStartTime.add(frequency, "minute");
        continue;
      }

      // Mark this slot boundary as taken
      slotBoundaries.set(slotStartTime.valueOf(), true);

      // Check if the date has out-of-office info
      const outOfOffice = datesOutOfOffice?.[dateKey];

      // Prepare slot data with or without out-of-office metadata
      const slotData = outOfOffice
        ? {
            time: slotStartTime,
            away: true,
            ...(outOfOffice.fromUser && { fromUser: outOfOffice.fromUser }),
            ...(outOfOffice.toUser && { toUser: outOfOffice.toUser }),
            ...(outOfOffice.reason && { reason: outOfOffice.reason }),
            ...(outOfOffice.emoji && { emoji: outOfOffice.emoji }),
          }
        : { time: slotStartTime };

      slots.set(slotKey, slotData);

      slotStartTime = slotStartTime.add(frequency, "minute");
    }
  }

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
}: GetSlots) => {
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
