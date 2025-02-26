import type { IFromUser, IOutOfOfficeData, IToUser } from "@calcom/core/getUserAvailability";
import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";

import { getTimeZone } from "./date-fns";
import type { DateRange } from "./date-ranges";

export type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  dateRanges?: DateRange[];
  minimumBookingNotice: number;
  eventLength: number;
  offsetStart?: number;
  organizerTimeZone?: string;
  datesOutOfOffice?: IOutOfOfficeData;
};
export type TimeFrame = { userIds?: number[]; startTime: number; endTime: number };

const minimumOfOne = (input: number) => (input < 1 ? 1 : input);
const minimumOfZero = (input: number) => (input < 0 ? 0 : input);

function buildSlots({
  startOfInviteeDay,
  computedLocalAvailability,
  frequency,
  eventLength,
  offsetStart = 0,
  startDate,
  organizerTimeZone,
  inviteeTimeZone,
}: {
  computedLocalAvailability: TimeFrame[];
  startOfInviteeDay: Dayjs;
  startDate: Dayjs;
  frequency: number;
  eventLength: number;
  offsetStart?: number;
  organizerTimeZone: string;
  inviteeTimeZone: string;
}) {
  // no slots today
  if (startOfInviteeDay.isBefore(startDate, "day")) {
    return [];
  }
  // keep the old safeguards in; may be needed.
  frequency = minimumOfOne(frequency);
  eventLength = minimumOfOne(eventLength);
  offsetStart = minimumOfZero(offsetStart);

  // A day starts at 00:00 unless the startDate is the same as the current day
  const dayStart = startOfInviteeDay.isSame(startDate, "day")
    ? Math.ceil((startDate.hour() * 60 + startDate.minute()) / frequency) * frequency
    : 0;

  // Record type so we can use slotStart as key
  const slotsTimeFrameAvailable: Record<
    string,
    {
      userIds: number[];
      startTime: number;
      endTime: number;
    }
  > = {};
  // get boundaries sorted by start time.
  const boundaries = computedLocalAvailability
    .map((item) => [item.startTime < dayStart ? dayStart : item.startTime, item.endTime])
    .sort((a, b) => a[0] - b[0]);

  const ranges: number[][] = [];
  let currentRange: number[] = [];
  for (const [start, end] of boundaries) {
    // bypass invalid value
    if (start >= end) continue;
    // fill first elem
    if (!currentRange.length) {
      currentRange = [start, end];
      continue;
    }
    if (currentRange[1] < start) {
      ranges.push(currentRange);
      currentRange = [start, end];
    } else if (currentRange[1] < end) {
      currentRange[1] = end;
    }
  }
  if (currentRange) {
    ranges.push(currentRange);
  }

  for (const [boundaryStart, boundaryEnd] of ranges) {
    // loop through the day, based on frequency.
    for (
      let slotStart = boundaryStart + offsetStart;
      slotStart < boundaryEnd;
      slotStart += offsetStart + frequency
    ) {
      computedLocalAvailability.forEach((item) => {
        // TODO: This logic does not allow for past-midnight bookings.
        if (slotStart < item.startTime || slotStart > item.endTime + 1 - eventLength) {
          return;
        }
        slotsTimeFrameAvailable[slotStart.toString()] = {
          userIds: (slotsTimeFrameAvailable[slotStart]?.userIds || []).concat(item.userIds || []),
          startTime: slotStart,
          endTime: slotStart + eventLength,
        };
      });
    }
  }

  const organizerDSTDiff =
    dayjs().tz(organizerTimeZone).utcOffset() - startOfInviteeDay.tz(organizerTimeZone).utcOffset();
  const inviteeDSTDiff =
    dayjs().tz(inviteeTimeZone).utcOffset() - startOfInviteeDay.tz(inviteeTimeZone).utcOffset();
  const slots: { time: Dayjs; userIds?: number[] }[] = [];
  const getTime = (time: number) => {
    const minutes = time + organizerDSTDiff - inviteeDSTDiff;

    return startOfInviteeDay.tz(inviteeTimeZone).add(minutes, "minutes");
  };
  for (const item of Object.values(slotsTimeFrameAvailable)) {
    /*
     * @calcom/web:dev: 2022-11-06T00:00:00-04:00
     * @calcom/web:dev: 2022-11-06T01:00:00-04:00
     * @calcom/web:dev: 2022-11-06T01:00:00-04:00 <-- note there is no offset change, but we did lose an hour.
     * @calcom/web:dev: 2022-11-06T02:00:00-04:00
     * @calcom/web:dev: 2022-11-06T03:00:00-04:00
     * ...
     */
    slots.push({
      userIds: item.userIds,
      time: getTime(item.startTime),
    });
  }

  return slots;
}

function buildSlotsWithDateRangesOld({
  dateRanges,
  frequency,
  eventLength,
  timeZone,
  minimumBookingNotice,
  organizerTimeZone,
  offsetStart,
  datesOutOfOffice,
}: {
  dateRanges: DateRange[];
  frequency: number;
  eventLength: number;
  timeZone: string;
  minimumBookingNotice: number;
  organizerTimeZone: string;
  offsetStart?: number;
  datesOutOfOffice?: IOutOfOfficeData;
}) {
  // keep the old safeguards in; may be needed.
  frequency = minimumOfOne(frequency);
  eventLength = minimumOfOne(eventLength);
  offsetStart = offsetStart ? minimumOfOne(offsetStart) : 0;
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

  dateRanges.forEach((range) => {
    const dateYYYYMMDD = range.start.format("YYYY-MM-DD");
    const startTimeWithMinNotice = dayjs.utc().add(minimumBookingNotice, "minute");

    let slotStartTime = range.start.utc().isAfter(startTimeWithMinNotice)
      ? range.start
      : startTimeWithMinNotice;

    slotStartTime =
      slotStartTime.minute() % interval !== 0
        ? slotStartTime.startOf("hour").add(Math.ceil(slotStartTime.minute() / interval) * interval, "minute")
        : slotStartTime;

    // Adding 1 minute to date ranges that end at midnight to ensure that the last slot is included
    const rangeEnd = range.end
      .add(dayjs().tz(organizerTimeZone).utcOffset(), "minutes")
      .isSame(range.end.endOf("day").add(dayjs().tz(organizerTimeZone).utcOffset(), "minutes"), "minute")
      ? range.end.add(1, "minute")
      : range.end;

    slotStartTime = slotStartTime.add(offsetStart ?? 0, "minutes").tz(timeZone);

    while (!slotStartTime.add(eventLength, "minutes").subtract(1, "second").utc().isAfter(rangeEnd)) {
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

      slots.push(slotData);
      slotStartTime = slotStartTime.add(frequency + (offsetStart ?? 0), "minutes");
    }
  });

  return slots;
}

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

  const orderedDateRanges = dateRanges.sort((a, b) => a.start.valueOf() - b.start.valueOf());
  orderedDateRanges.forEach((range) => {
    const dateYYYYMMDD = range.start.format("YYYY-MM-DD");

    let slotStartTime = range.start.utc().isAfter(startTimeWithMinNotice)
      ? range.start
      : startTimeWithMinNotice;

    slotStartTime =
      slotStartTime.minute() % interval !== 0
        ? slotStartTime.startOf("hour").add(Math.ceil(slotStartTime.minute() / interval) * interval, "minute")
        : slotStartTime;

    slotStartTime = slotStartTime.add(offsetStart ?? 0, "minutes").tz(timeZone);

    // if the slotStartTime is between an existing slot, we need to adjust to the begin of the existing slot
    // but that adjusted startTime must be legal.
    const iterator = slots.keys();
    let result = iterator.next();

    while (!result.done) {
      const utcResultValue = dayjs.utc(result.value);
      // if the slotStartTime is between an existing slot, we need to adjust to the begin of the existing slot
      if (
        utcResultValue.isBefore(slotStartTime) &&
        utcResultValue.add(frequency + (offsetStart ?? 0), "minutes").isAfter(slotStartTime)
      ) {
        // however, the slot can now be before the start of this date range.
        if (!utcResultValue.isBefore(range.start)) {
          // it is between, if possible floor down to the start of the existing slot
          slotStartTime = utcResultValue;
        } else {
          // if not possible to floor, we need to ceil up to the next slot.
          slotStartTime = utcResultValue.add(frequency + (offsetStart ?? 0), "minutes");
        }
        // and then convert to the correct timezone - UTC mode is just for performance.
        slotStartTime = slotStartTime.tz(timeZone);
      }
      result = iterator.next();
    }
    while (!slotStartTime.add(eventLength, "minutes").subtract(1, "second").utc().isAfter(range.end)) {
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

      slots.set(slotData.time.toISOString(), slotData);
      slotStartTime = slotStartTime.add(frequency + (offsetStart ?? 0), "minutes");
    }
  });

  return Array.from(slots.values());
}

function fromIndex<T>(cb: (val: T, i: number, a: T[]) => boolean, index: number) {
  return function (e: T, i: number, a: T[]) {
    return i >= index && cb(e, i, a);
  };
}

const getSlots = ({
  inviteeDate,
  frequency,
  minimumBookingNotice,
  dateRanges,
  eventLength,
  offsetStart = 0,
  organizerTimeZone,
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
  if (dateRanges && !organizerTimeZone) {
    return buildSlotsWithDateRanges({
      dateRanges,
      frequency,
      eventLength,
      timeZone: getTimeZone(inviteeDate),
      minimumBookingNotice,
      offsetStart,
      datesOutOfOffice,
    });
  } else if (dateRanges && organizerTimeZone) {
    return buildSlotsWithDateRangesOld({
      dateRanges,
      frequency,
      eventLength,
      timeZone: getTimeZone(inviteeDate),
      minimumBookingNotice,
      organizerTimeZone,
      offsetStart,
      datesOutOfOffice,
    });
  }
  // just to ensure we don't call this anywhere. APIv1/v2 + webapp use dateRanges.
  throw new Error("Deprecated invocation of getSlots, use dateRanges instead.");
};

export default getSlots;
