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

  const newSlots: {
    time: Dayjs;
    userIds?: number[];
    away?: boolean;
    fromUser?: IFromUser;
    toUser?: IToUser;
    reason?: string;
    emoji?: string;
  }[] = [];

  let interval = Number(process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL) || 1;
  const intervalsWithDefinedStartTimes = [60, 30, 20, 15, 10, 5];

  for (let i = 0; i < intervalsWithDefinedStartTimes.length; i++) {
    if (frequency % intervalsWithDefinedStartTimes[i] === 0) {
      interval = intervalsWithDefinedStartTimes[i];
      break;
    }
  }

  const startTimeWithMinNotice = dayjs.utc().add(minimumBookingNotice, "minute");
  // get maximum slot count based on the date ranges.
  let startDateTime = orderedDateRanges[0].start.tz(timeZone);
  // apply interval
  startDateTime =
    startDateTime.minute() % interval !== 0
      ? startDateTime.startOf("hour").add(Math.ceil(startDateTime.minute() / interval) * interval, "minute")
      : startDateTime;
  // now apply the initial slot offset start, if any.
  startDateTime = startDateTime.add(offsetStart ?? 0, "minutes");
  // how many slots can we skip based on start time? note this number can be negative and this is intentional, that just works.
  const slotCountSkipBefore = Math.ceil(
    (startTimeWithMinNotice.valueOf() - startDateTime.valueOf()) / (frequency * 60_000)
  );
  // Amount of slots required to skip because of event length.
  const slotCountSkipAfter = Math.ceil(eventLength / frequency) - 1;
  // using date ranges, we build a slot map.
  const slotMap = orderedDateRanges.reduce<Map<number, number>>((acc, range) => {
    const startSlotIndex = Math.floor(
      (range.start.valueOf() - startDateTime.valueOf()) / ((frequency + offsetStart) * 60_000)
    );
    const slotCount = Math.floor(
      (range.end.valueOf() + 1000 - range.start.valueOf()) / ((frequency + offsetStart) * 60_000)
    );
    acc.set(
      Math.max(startSlotIndex, slotCountSkipBefore),
      (slotCountSkipBefore > startSlotIndex ? slotCount - slotCountSkipBefore : slotCount) -
        slotCountSkipAfter
    );
    return acc;
  }, new Map());

  let nextStartSlotIndex = 0;

  slotMap.forEach((slotCount, startSlotIndex) => {
    let jumpOver = 0;
    if (startSlotIndex < nextStartSlotIndex) {
      // this means that we already have processed this slot index, so we can skip it.
      if (startSlotIndex + slotCount > nextStartSlotIndex) {
        // e.g. 0 => 3, 1 => 4, we want to skip 2 and 3, but process 4.
        jumpOver = nextStartSlotIndex - startSlotIndex;
      } else {
        return; // this entire slot range is already processed, so we can skip it.
      }
    }
    for (let i = jumpOver; i < slotCount; i++) {
      nextStartSlotIndex++;
      const slotStartTime = startDateTime.add((startSlotIndex + i) * (frequency + offsetStart), "minutes");
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

      const dateYYYYMMDD = slotStartTime.format("YYYY-MM-DD");
      const dateOutOfOfficeExists = datesOutOfOffice?.[dateYYYYMMDD];
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
      newSlots.push(slotData);
    }
  });

  return newSlots;
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
