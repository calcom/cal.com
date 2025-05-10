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

  const is45MinInterval = frequency === 45;
  const isISTTimezone = timeZone === "Asia/Kolkata" || timeZone === "Asia/Calcutta" || timeZone === "+5:30";

  const isISTSchedule =
    dateRanges.length > 0 && (dateRanges.some((range) => range.start.minute() === 30) || isISTTimezone);

  let slotMinuteOffset = 0;

  if (is45MinInterval) {
    slotMinuteOffset = 0;
  } else if (offsetStart && offsetStart > 0) {
    slotMinuteOffset = offsetStart;
  } else if (isHalfHourTimezone || isISTTimezone || isISTSchedule) {
    slotMinuteOffset = 30;
  } else {
    slotMinuteOffset = dateRanges.length > 0 ? dateRanges[0].start.minute() : 0;
  }

  const orderedDateRanges = dateRanges.sort((a, b) => a.start.valueOf() - b.start.valueOf());

  const processedDates = new Set<string>();

  orderedDateRanges.forEach((range) => {
    const dateYYYYMMDD = range.start.format("YYYY-MM-DD");
    processedDates.add(dateYYYYMMDD);

    let slotStartTimeUTC = range.start.utc().isAfter(startTimeWithMinNotice)
      ? range.start.utc()
      : startTimeWithMinNotice;

    slotStartTimeUTC =
      slotStartTimeUTC.minute() % interval !== 0
        ? slotStartTimeUTC
            .startOf("hour")
            .add(Math.ceil(slotStartTimeUTC.minute() / interval) * interval, "minute")
        : slotStartTimeUTC;

    if (offsetStart && offsetStart > 0) {
      slotStartTimeUTC = slotStartTimeUTC.add(offsetStart, "minutes");
    }

    const currentMinute = slotStartTimeUTC.minute();

    if (is45MinInterval) {
      if (currentMinute !== 0 && currentMinute !== 45) {
        const minutesIntoHour = currentMinute % 60;
        if (minutesIntoHour < 23) {
          slotStartTimeUTC = slotStartTimeUTC.minute(0);
        } else if (minutesIntoHour < 53) {
          slotStartTimeUTC = slotStartTimeUTC.minute(45);
        } else {
          slotStartTimeUTC = slotStartTimeUTC.add(1, "hour").minute(0);
        }
      }
    } else if (currentMinute !== slotMinuteOffset && (isHalfHourTimezone || isISTTimezone)) {
      slotStartTimeUTC = slotStartTimeUTC.minute(slotMinuteOffset);
    }

    let slotStartTime = slotStartTimeUTC.tz(timeZone);

    const iterator = slots.keys();
    let result = iterator.next();

    while (!result.done) {
      const utcResultValue = dayjs.utc(result.value);
      if (
        utcResultValue.isBefore(slotStartTime) &&
        utcResultValue.add(frequency + (offsetStart ?? 0), "minutes").isAfter(slotStartTime)
      ) {
        if (!utcResultValue.isBefore(range.start)) {
          slotStartTimeUTC = utcResultValue;
        } else {
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

      const nextMinute = currentSlotUTC.minute();

      if (is45MinInterval) {
        if (nextMinute !== 0 && nextMinute !== 45) {
          const minutesIntoHour = nextMinute % 60;
          if (minutesIntoHour < 23) {
            currentSlotUTC = currentSlotUTC.minute(0);
          } else if (minutesIntoHour < 53) {
            currentSlotUTC = currentSlotUTC.minute(45);
          } else {
            currentSlotUTC = currentSlotUTC.add(1, "hour").minute(0);
          }
        }
      } else if (nextMinute !== slotMinuteOffset && (isHalfHourTimezone || isISTTimezone)) {
        currentSlotUTC = currentSlotUTC.minute(slotMinuteOffset);
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
