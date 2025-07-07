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
  showOptimizedSlots?: boolean | null;
};
export type TimeFrame = { userIds?: number[]; startTime: number; endTime: number };

const minimumOfOne = (input: number) => (input < 1 ? 1 : input);

function getCorrectedSlotStartTime(
  showOptimizedSlots: boolean | null | undefined,
  interval: number,
  slotStartTime: dayjs.Dayjs,
  range: DateRange
) {
  let correctedSlotStartTime = slotStartTime;
  if (showOptimizedSlots) {
    // if showOptimizedSlots option is selected, the slotStartTime should not be modified,
    // so that maximum possible slots are shown.
    // The below logic in this entire `if branch` only tries to add an increment if sufficient minutes are available (after max possible slots are consumed),
    // so that slots are shown respecting the 'Start of the Hour'.
    const minutesRequiredToMoveToNextSlot = interval - (slotStartTime.minute() % interval);
    const minutesRequiredToMoveTo15MinSlot = 15 - (slotStartTime.minute() % 15);
    const extraMinutesAvailable = range.end.diff(slotStartTime, "minutes") % interval;

    if (extraMinutesAvailable >= minutesRequiredToMoveToNextSlot) {
      // For cases like, Availability -> 9:05 - 12:00, 60Min EventTypes.
      // Total available minutes are 175, so only 2 60Min slots can be provided max
      // And still 175-120 = 55mins are available, hence 'slotStartTime' is pushed to 10:00 to respect 'Start of the Hour'.
      // Slots will be shown as '10:00, 11:00' instead of '09:05, 10:05'
      correctedSlotStartTime = slotStartTime.add(minutesRequiredToMoveToNextSlot, "minute");
    } else if (extraMinutesAvailable >= minutesRequiredToMoveTo15MinSlot) {
      // For cases like, Availability -> 9:05 - 11:55, 60Min EventTypes.
      // Total available minutes are 170, so only 2 60Min slots can be provided max
      // And still 175-120 = 50mins are available, but it is less 55mins which is required to push to 10:00
      // so slotStartTime is pushed to next 15Min slot 09:15, instead of showing slots like 9:05,10:05 now slots will be 9:15,10:15
      correctedSlotStartTime = slotStartTime.add(minutesRequiredToMoveTo15MinSlot, "minute");
    } else if (dayjs.utc().startOf("day").isSame(dayjs.utc(slotStartTime).startOf("day"), "day")) {
      // For current date booking cases, if current time is like 4:54, slotStartTime will be 5:00
      correctedSlotStartTime = slotStartTime
        .startOf("hour")
        .add(Math.ceil(slotStartTime.minute() / interval) * interval, "minute");
    }
  } else {
    correctedSlotStartTime = slotStartTime
      .startOf("hour")
      .add(Math.ceil(slotStartTime.minute() / interval) * interval, "minute");
  }
  return correctedSlotStartTime;
}

function buildSlotsWithDateRanges({
  dateRanges,
  frequency,
  eventLength,
  timeZone,
  minimumBookingNotice,
  offsetStart,
  datesOutOfOffice,
  showOptimizedSlots,
}: {
  dateRanges: DateRange[];
  frequency: number;
  eventLength: number;
  timeZone: string;
  minimumBookingNotice: number;
  offsetStart?: number;
  datesOutOfOffice?: IOutOfOfficeData;
  showOptimizedSlots?: boolean | null;
}) {
  // keep the old safeguards in; may be needed.
  frequency = minimumOfOne(frequency);
  eventLength = minimumOfOne(eventLength);
  offsetStart = offsetStart ? minimumOfOne(offsetStart) : 0;

  const orderedDateRanges = dateRanges.sort((a, b) => a.start.valueOf() - b.start.valueOf());

  // there can only ever be one slot at a given start time, and based on duration also only a single length.
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

  let interval = Number(process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL) || 1;
  const intervalsWithDefinedStartTimes = [60, 30, 20, 15, 10, 5];

  for (let i = 0; i < intervalsWithDefinedStartTimes.length; i++) {
    if (frequency % intervalsWithDefinedStartTimes[i] === 0) {
      interval = intervalsWithDefinedStartTimes[i];
      break;
    }
  }

  const startTimeWithMinNotice = dayjs.utc().add(minimumBookingNotice, "minute");

  const slotBoundaries = new Map<string, true>();

  orderedDateRanges.forEach((range) => {
    const dateYYYYMMDD = range.start.format("YYYY-MM-DD");

    let slotStartTime = range.start.utc().isAfter(startTimeWithMinNotice)
      ? range.start
      : startTimeWithMinNotice;

    if (slotStartTime.minute() % interval !== 0) {
      slotStartTime = getCorrectedSlotStartTime(showOptimizedSlots, interval, slotStartTime, range);
    }

    slotStartTime = slotStartTime.add(offsetStart ?? 0, "minutes").tz(timeZone);

    // Find the nearest appropriate slot boundary if this time falls within an existing slot
    const slotBoundariesArray = Array.from(slotBoundaries.keys()).map((t) => dayjs(t));
    if (slotBoundariesArray.length > 0) {
      slotBoundariesArray.sort((a, b) => a.valueOf() - b.valueOf());

      let prevBoundary = null;
      for (let i = slotBoundariesArray.length - 1; i >= 0; i--) {
        if (slotBoundariesArray[i].isBefore(slotStartTime)) {
          prevBoundary = slotBoundariesArray[i];
          break;
        }
      }

      if (prevBoundary) {
        const prevBoundaryEnd = prevBoundary.add(frequency + (offsetStart ?? 0), "minutes");
        if (prevBoundaryEnd.isAfter(slotStartTime)) {
          if (!prevBoundary.isBefore(range.start)) {
            slotStartTime = prevBoundary;
          } else {
            slotStartTime = prevBoundaryEnd;
          }
          slotStartTime = slotStartTime.tz(timeZone);
        }
      }
    }

    while (!slotStartTime.add(eventLength, "minutes").subtract(1, "second").utc().isAfter(range.end)) {
      const slotKey = slotStartTime.toISOString();
      if (slots.has(slotKey)) {
        slotStartTime = slotStartTime.add(frequency + (offsetStart ?? 0), "minutes");
        continue;
      }

      slotBoundaries.set(slotKey, true);

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
      slotStartTime = slotStartTime.add(frequency + (offsetStart ?? 0), "minutes");
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
  showOptimizedSlots,
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
    showOptimizedSlots,
  });
};

export default withReporting(getSlots, "getSlots");
