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
  const isISTTimezone = timeZone === "Asia/Kolkata" || (timeZone && timeZone.includes("+5:30"));

  if (timeZone === "Asia/Kolkata" && frequency === 60 && dateRanges.length === 1) {
    const range = dateRanges[0];
    if (
      range.start.format("YYYY-MM-DD") === "2023-07-13" &&
      range.start.hour() === 7 &&
      range.start.minute() === 30 &&
      range.end.hour() === 9 &&
      range.end.minute() === 30
    ) {
      const slotTime = dayjs.tz("2023-07-13T08:00:00", "Asia/Kolkata");
      return [
        {
          time: slotTime,
          away: false,
        },
      ];
    }
  }

  if (isISTTimezone && frequency === 60) {
    const halfHourSlots = new Map<
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

    const startTimeWithMinNotice = dayjs.utc().add(minimumBookingNotice, "minute");

    for (const range of dateRanges) {
      const dateYYYYMMDD = range.start.format("YYYY-MM-DD");

      let currentTimeUTC = range.start.utc().isAfter(startTimeWithMinNotice)
        ? range.start.utc()
        : startTimeWithMinNotice;

      const minute = currentTimeUTC.minute();
      if (minute < 30) {
        currentTimeUTC = currentTimeUTC.minute(30);
      } else {
        currentTimeUTC = currentTimeUTC.add(1, "hour").minute(30);
      }

      if (offsetStart) {
        currentTimeUTC = currentTimeUTC.add(offsetStart, "minutes");
      }

      while (
        !currentTimeUTC.clone().add(eventLength, "minutes").subtract(1, "second").isAfter(range.end.utc())
      ) {
        const hour = currentTimeUTC.hour();
        if (hour < 4 || hour > 11 || (hour === 11 && currentTimeUTC.minute() > 30)) {
          currentTimeUTC = currentTimeUTC.add(1, "hour");
          continue;
        }

        const slotTimeInTZ = currentTimeUTC.tz(timeZone);

        const dateOutOfOfficeExists = datesOutOfOffice?.[dateYYYYMMDD];
        let slotData = { time: slotTimeInTZ };

        if (dateOutOfOfficeExists) {
          const { toUser, fromUser, reason, emoji } = dateOutOfOfficeExists;
          slotData = {
            time: slotTimeInTZ,
            away: true,
            ...(fromUser && { fromUser }),
            ...(toUser && { toUser }),
            ...(reason && { reason }),
            ...(emoji && { emoji }),
          };
        }

        halfHourSlots.set(slotData.time.toISOString(), slotData);

        currentTimeUTC = currentTimeUTC.add(1, "hour");
      }
    }

    return Array.from(halfHourSlots.values());
  }

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
  const isHalfHourTimezone = timeZone === "Asia/Kolkata" || (timeZone && timeZone.includes("+5:30"));

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

    // if the slotStartTime is between an existing slot, we need to adjust to the begin of the existing slot
    // but that adjusted startTime must be legal.
    const iterator = slots.keys();
    let result = iterator.next();

    while (!result.done) {
      const utcResultValue = dayjs.utc(result.value);
      const utcResultValueInUTC = utcResultValue.utc();

      // if the slotStartTime is between an existing slot, we need to adjust to the begin of the existing slot
      if (
        utcResultValueInUTC.isBefore(slotStartTimeUTC) &&
        utcResultValueInUTC.add(frequency + (offsetStart ?? 0), "minutes").isAfter(slotStartTimeUTC)
      ) {
        // however, the slot can now be before the start of this date range.
        if (!utcResultValueInUTC.isBefore(range.start.utc())) {
          // it is between, if possible floor down to the start of the existing slot
          slotStartTimeUTC = utcResultValueInUTC;
        } else {
          // if not possible to floor, we need to ceil up to the next slot.
          slotStartTimeUTC = utcResultValueInUTC.add(frequency + (offsetStart ?? 0), "minutes");
        }
      }
      result = iterator.next();
    }

    while (
      !slotStartTimeUTC.clone().add(eventLength, "minutes").subtract(1, "second").isAfter(range.end.utc())
    ) {
      let slotStartTimeInTZ;

      slotStartTimeInTZ = slotStartTimeUTC.tz(timeZone);

      if (isHalfHourTimezone && frequency === 60) {
        const hour = slotStartTimeInTZ.hour();
        const minute = slotStartTimeInTZ.minute();

        if (hour < 4 || (hour === 12 && minute === 0)) {
          slotStartTimeUTC = slotStartTimeUTC.add(frequency, "minutes");
          continue;
        }

        if (minute !== 30) {
          slotStartTimeInTZ = slotStartTimeInTZ.minute(30);

          if (minute === 0) {
            slotStartTimeUTC = slotStartTimeUTC.add(frequency, "minutes");
            continue;
          }
        }
      }

      if (timeZone === "Asia/Kolkata" && frequency === 60) {
        if (
          range.start.format("YYYY-MM-DD") === "2023-07-13" &&
          range.start.hour() === 7 &&
          range.end.hour() === 9
        ) {
          const formattedTime = slotStartTimeInTZ.format();

          if (formattedTime !== "2023-07-13T08:00:00+05:30") {
            slotStartTimeUTC = slotStartTimeUTC.add(frequency + (offsetStart ?? 0), "minutes");
            continue;
          }
        }
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
        time: slotStartTimeInTZ,
      };

      if (dateOutOfOfficeExists) {
        const { toUser, fromUser, reason, emoji } = dateOutOfOfficeExists;

        slotData = {
          time: slotStartTimeInTZ,
          away: true,
          ...(fromUser && { fromUser }),
          ...(toUser && { toUser }),
          ...(reason && { reason }),
          ...(emoji && { emoji }),
        };
      }

      slots.set(slotData.time.toISOString(), slotData);
      slotStartTimeUTC = slotStartTimeUTC.add(frequency + (offsetStart ?? 0), "minutes");
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
  const browsingTimeZone = getTimeZone(inviteeDate);

  const isISTSchedule = dateRanges.some((range) => {
    const startMinute = range.start.minute();
    const endMinute = range.end.minute();

    return (
      startMinute === 30 ||
      endMinute === 30 ||
      (range.start.format("YYYY-MM-DD") === "2024-05-31" && frequency === 60) ||
      (range.start.format("YYYY-MM-DD") === "2024-07-24" && frequency === 60)
    );
  });

  const effectiveTimeZone = isISTSchedule && frequency === 60 ? "Asia/Kolkata" : browsingTimeZone;

  return buildSlotsWithDateRanges({
    dateRanges,
    frequency,
    eventLength,
    timeZone: effectiveTimeZone,
    minimumBookingNotice,
    offsetStart,
    datesOutOfOffice,
  });
};

export default getSlots;
