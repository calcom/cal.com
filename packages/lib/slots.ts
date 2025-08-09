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

  console.log(orderedDateRanges);

  const slots: {
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
  const startDateTime = orderedDateRanges[0].start.tz(timeZone);
  const utcOffset = startDateTime.utcOffset() % interval;

  // using date ranges, we build a slot map.
  const slotMap = orderedDateRanges.reduce<Map<number, { skip?: boolean }>>((acc, range) => {
    // (short-circuit) skip ranges that end before the first slot that needs to be listed.
    if (range.end.valueOf() < startTimeWithMinNotice.valueOf()) {
      return acc;
    }
    // each day can be considered to comprise of a countable number of slots, in the worst case, this is 288/day (5-minute slots).
    // ordered date ranges are sorted, so we can safely assume that the first range is the earliest one of the day, regardless of the time zone.
    const minuteRangeStart = range.start.valueOf() / 60_000;
    // this handles mostly end-of-day timestamps, but based on hour as we're not sure of the time zone.
    const minuteRangeEnd =
      (range.end.valueOf() % 3_600_000 === 3_599_000 ? range.end.valueOf() + 1000 : range.end.valueOf()) /
      60_000;

    // earlier ranges do not exist, but identical ranges may.
    const minuteRangeStartComputed =
      (minuteRangeStart % interval !== 0
        ? Math.ceil(minuteRangeStart / interval) * interval
        : minuteRangeStart) +
      utcOffset +
      offsetStart;

    const slotLength = eventLength + offsetStart;

    for (
      let i = 0;
      i <= Math.floor((minuteRangeEnd - minuteRangeStartComputed - slotLength) / interval);
      i++
    ) {
      const key = minuteRangeStartComputed + i * (frequency + offsetStart);
      if (acc.has(key)) continue;
      // minimum notice period is applied here.
      if (key < startTimeWithMinNotice.valueOf() / 60_000) {
        acc.set(key, { skip: true });
        continue;
      }
      acc.set(key, {});
      // when event length is greater than the interval, we need to block the next slots as well.
      for (let j = 1; j < Math.floor(frequency / interval); j++) {
        acc.set(key + j * interval, { skip: true });
        // also skip ahead i;
        i++;
      }
    }

    return acc;
  }, new Map());

  console.log({ slotMap });

  slotMap.forEach(({ skip }, slotStartValueOf) => {
    if (skip) return;
    const slotStartTime = dayjs(slotStartValueOf * 60_000).tz(timeZone);
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
    slots.push(slotData);
  });

  return slots;
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
