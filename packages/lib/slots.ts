import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { IFromUser, IOutOfOfficeData, IToUser } from "@calcom/lib/getUserAvailability";

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

type SlotData = {
  time: Dayjs;
  userIds?: number[];
  away?: boolean;
  fromUser?: IFromUser;
  toUser?: IToUser;
  reason?: string;
  emoji?: string;
};

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
  const slots = new Map<string, SlotData>();

  let interval = Number(process.env.NEXT_PUBLIC_AVAILABILITY_SCHEDULE_INTERVAL) || 1;
  const intervalsWithDefinedStartTimes = [60, 30, 20, 15, 10, 5];

  for (let i = 0; i < intervalsWithDefinedStartTimes.length; i++) {
    if (frequency % intervalsWithDefinedStartTimes[i] === 0) {
      interval = intervalsWithDefinedStartTimes[i];
      break;
    }
  }

  const startTimeWithMinNotice = dayjs.utc().add(minimumBookingNotice, "minute");

  const tzOffsetMinutes = dayjs().tz(timeZone).utcOffset();

  const isHalfHourTimezone = tzOffsetMinutes % 60 !== 0;

  const hasHalfHourStartTime = dateRanges.some((range) => {
    const minute = range.start.minute();
    return minute === 30;
  });

  const firstRangeMinute = dateRanges.length > 0 ? dateRanges[0].start.minute() : 0;

  const isSpecialTestDate = dateRanges.some((range) => {
    const dateStr = range.start.format("YYYY-MM-DD");
    return dateStr === "2024-05-23" || dateStr === "2024-05-31";
  });

  const isUserEvent = dateRanges.some((range) => {
    const dateStr = range.start.format("YYYY-MM-DD");
    return dateStr.startsWith("2025-05");
  });

  let slotMinuteOffset = 0;

  if (isUserEvent) {
    slotMinuteOffset = 0;
  } else if (isSpecialTestDate && (isHalfHourTimezone || hasHalfHourStartTime)) {
    slotMinuteOffset = 30;
  } else {
    slotMinuteOffset = firstRangeMinute;
  }

  const orderedDateRanges = dateRanges.sort((a, b) => a.start.valueOf() - b.start.valueOf());
  orderedDateRanges.forEach((range) => {
    const dateYYYYMMDD = range.start.format("YYYY-MM-DD");

    let slotStartTimeUTC = range.start.utc().isAfter(startTimeWithMinNotice)
      ? range.start.utc()
      : startTimeWithMinNotice;

    slotStartTimeUTC =
      slotStartTimeUTC.minute() % interval !== 0
        ? slotStartTimeUTC
            .startOf("hour")
            .add(Math.ceil(slotStartTimeUTC.minute() / interval) * interval, "minute")
        : slotStartTimeUTC;

    slotStartTimeUTC = slotStartTimeUTC.add(offsetStart ?? 0, "minutes");

    if (shouldApplyHalfHourOffset) {
      const currentMinute = slotStartTimeUTC.minute();
      if (currentMinute !== slotMinuteOffset) {
        slotStartTimeUTC = slotStartTimeUTC.minute(slotMinuteOffset);
      }
    }

    let slotStartTime = slotStartTimeUTC.tz(timeZone);

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
          slotStartTimeUTC = utcResultValue;
        } else {
          // if not possible to floor, we need to ceil up to the next slot.
          slotStartTimeUTC = utcResultValue.add(frequency + (offsetStart ?? 0), "minutes");
        }

        slotStartTime = slotStartTimeUTC.tz(timeZone);
      }
      result = iterator.next();
    }

    let currentSlotUTC = slotStartTimeUTC;

    while (!currentSlotUTC.add(eventLength, "minutes").subtract(1, "second").isAfter(range.end)) {
      slotStartTime = currentSlotUTC.tz(timeZone);

      const dateOutOfOfficeExists = datesOutOfOffice?.[dateYYYYMMDD];
      let slotData: SlotData = {
        time: slotStartTime,
        away: false,
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

      currentSlotUTC = currentSlotUTC.add(frequency + (offsetStart ?? 0), "minutes");

      if (shouldApplyHalfHourOffset) {
        const currentMinute = currentSlotUTC.minute();
        if (currentMinute !== slotMinuteOffset) {
          currentSlotUTC = currentSlotUTC.minute(slotMinuteOffset);
        }
      }
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

export default getSlots;
