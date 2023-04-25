import type { Dayjs } from "@calcom/dayjs";
import dayjs from "@calcom/dayjs";
import type { WorkingHours, TimeRange as DateOverride } from "@calcom/types/schedule";

import { getWorkingHours } from "./availability";
import { getTimeZone } from "./date-fns";

export type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  workingHours: WorkingHours[];
  dateOverrides?: DateOverride[];
  minimumBookingNotice: number;
  eventLength: number;
  organizerTimeZone: string;
};
export type TimeFrame = { userIds?: number[]; startTime: number; endTime: number };

const minimumOfOne = (input: number) => (input < 1 ? 1 : input);

function buildSlots({
  startOfInviteeDay,
  computedLocalAvailability,
  frequency,
  eventLength,
  startDate,
  organizerTimeZone,
  inviteeTimeZone,
}: {
  computedLocalAvailability: TimeFrame[];
  startOfInviteeDay: Dayjs;
  startDate: Dayjs;
  frequency: number;
  eventLength: number;
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
    for (let slotStart = boundaryStart; slotStart < boundaryEnd; slotStart += frequency) {
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

function fromIndex<T>(cb: (val: T, i: number, a: T[]) => boolean, index: number) {
  return function (e: T, i: number, a: T[]) {
    return i >= index && cb(e, i, a);
  };
}

const getSlots = ({
  inviteeDate,
  frequency,
  minimumBookingNotice,
  workingHours,
  dateOverrides = [],
  eventLength,
  organizerTimeZone,
}: GetSlots) => {
  // current date in invitee tz
  const startDate = dayjs().utcOffset(inviteeDate.utcOffset()).add(minimumBookingNotice, "minute");
  // This code is ran client side, startOf() does some conversions based on the
  // local tz of the client. Sometimes this shifts the day incorrectly.
  const startOfDayUTC = dayjs.utc().set("hour", 0).set("minute", 0).set("second", 0);
  const startOfInviteeDay = inviteeDate.startOf("day");
  // checks if the start date is in the past

  /**
   * TODO: change "day" for "hour" to stop displaying 1 day before today
   * This is displaying a day as available as sometimes difference between two dates is < 24 hrs.
   * But when doing timezones an available day for an owner can be 2 days available in other users tz.
   *
   * */
  if (inviteeDate.isBefore(startDate, "day")) {
    return [];
  }

  const timeZone: string = getTimeZone(inviteeDate);
  const workingHoursUTC = workingHours.map((schedule) => ({
    userId: schedule.userId,
    days: schedule.days,
    startTime: /* Why? */ startOfDayUTC.add(schedule.startTime, "minute"),
    endTime: /* Why? */ startOfDayUTC.add(schedule.endTime, "minute"),
  }));

  const localWorkingHours = getWorkingHours(
    {
      // initialize current day with timeZone without conversion, just parse.
      utcOffset: -dayjs.tz(dayjs(), timeZone).utcOffset(),
    },
    workingHoursUTC
  ).filter((hours) => hours.days.includes(inviteeDate.day()));

  // Here we split working hour in chunks for every frequency available that can fit in whole working hours
  const computedLocalAvailability: TimeFrame[] = [];
  let tempComputeTimeFrame: TimeFrame | undefined;
  const computeLength = localWorkingHours.length - 1;
  const makeTimeFrame = (item: (typeof localWorkingHours)[0]): TimeFrame => ({
    userIds: item.userId ? [item.userId] : [],
    startTime: item.startTime,
    endTime: item.endTime,
  });

  localWorkingHours.forEach((item, index) => {
    if (!tempComputeTimeFrame) {
      tempComputeTimeFrame = makeTimeFrame(item);
    } else {
      // please check the comment in splitAvailableTime func for the added 1 minute
      if (tempComputeTimeFrame.endTime + 1 === item.startTime) {
        // to deal with time that across the day, e.g. from 11:59 to to 12:01
        tempComputeTimeFrame.endTime = item.endTime;
      } else {
        computedLocalAvailability.push(tempComputeTimeFrame);
        tempComputeTimeFrame = makeTimeFrame(item);
      }
    }
    if (index == computeLength) {
      computedLocalAvailability.push(tempComputeTimeFrame);
    }
  });
  // an override precedes all the local working hour availability logic.
  const activeOverrides = dateOverrides.filter((override) => {
    if (dayjs.utc(override.start).isSame(dayjs.utc(override.end))) {
      return false;
    }
    return dayjs.utc(override.start).isBetween(startOfInviteeDay, startOfInviteeDay.endOf("day"), null, "[)");
  });

  //find date overrides that go over midnight and part of it belongs to this day
  const dateOverrideFromTheDayBefore = dateOverrides.filter((override) => {
    if (dayjs.utc(override.start).isSame(dayjs.utc(override.end))) {
      return false;
    }
    const inviteeUtcOffset = dayjs(override.end.toString()).tz(timeZone).utcOffset();
    if (dayjs.utc(override.end).isBetween(startOfInviteeDay, startOfInviteeDay.endOf("day"), null, "[)")) {
      if (
        dayjs.utc(override.end).add(inviteeUtcOffset, "minutes").utcOffset(0).day() !==
        dayjs.utc(override.start).add(inviteeUtcOffset, "minutes").utcOffset(0).day()
      ) {
        return true;
      }
    }
  });

  //handle full day overrides separately
  const fullDayOverrides = dateOverrides.filter((override) => {
    if (dayjs(override.start).isSame(dayjs(override.end))) {
    }

    const inviteeUtcOffset = dayjs(override.start.toString()).tz(timeZone).utcOffset();
    const scheduleUtcOffset = dayjs(override.start.toString()).tz(override.timeZone).utcOffset();

    const offset = inviteeUtcOffset - scheduleUtcOffset;

    if (dayjs(override.start).day() === inviteeDate.day()) {
      return true;
    }
  });

  if (!!dateOverrideFromTheDayBefore.length || !!activeOverrides.length || !!fullDayOverrides.length) {
    let overrides: {
      userIds: number[];
      startTime: number;
      endTime: number;
      belongsToDifferentDay: boolean;
      timeZone?: string;
    }[] = [];

    if (!!activeOverrides.length) {
      overrides = activeOverrides.flatMap((override) => {
        const inviteeUtcOffset = dayjs(override.start.toString()).tz(timeZone).utcOffset();
        const scheduleUtcOffset = dayjs(override.start.toString()).tz(override.timeZone).utcOffset();

        const endTime = dayjs.utc(override.end).add(inviteeUtcOffset, "minute");

        // defines if the override start in the schedule's time zone is on a different day than in the invitee's time zone
        const isDayBefore =
          dayjs.utc(override.start).add(inviteeUtcOffset, "minute").day() <
          dayjs.utc(override.start).add(scheduleUtcOffset, "minute").day();

        const endTimeWithCorrectMidnight = isDayBefore ? endTime.subtract(1, "minute") : endTime;

        return {
          userIds: override.userId ? [override.userId] : [],
          startTime:
            dayjs.utc(override.start).add(inviteeUtcOffset, "minute").hour() * 60 +
            dayjs.utc(override.start).utc().add(inviteeUtcOffset, "minute").minute(),
          endTime:
            dayjs.utc(override.start).utc().add(inviteeUtcOffset, "minute").hour() <=
            endTimeWithCorrectMidnight.hour()
              ? endTimeWithCorrectMidnight.hour() * 60 + endTimeWithCorrectMidnight.minute()
              : 24 * 60,
          belongsToDifferentDay: isDayBefore,
        };
      });
    }

    if (!!dateOverrideFromTheDayBefore.length) {
      const addditonalOverrides = dateOverrideFromTheDayBefore.flatMap((override) => {
        const inviteeUtcOffset = dayjs(override.start.toString()).tz(timeZone).utcOffset();
        const scheduleUtcOffset = dayjs(override.start.toString()).tz(override.timeZone).utcOffset();

        const isDayAfter =
          dayjs.utc(override.end).add(inviteeUtcOffset, "minute").day() !==
          dayjs.utc(override.end).add(scheduleUtcOffset, "minute").day();

        const endTime = dayjs.utc(override.end).add(inviteeUtcOffset, "minute");
        return {
          userIds: override.userId ? [override.userId] : [],
          startTime: 0,
          endTime: endTime.hour() * 60 + endTime.minute(),
          timeZone: override.timeZone,
          belongsToDifferentDay: isDayAfter,
        };
      });
      overrides = [...overrides, ...addditonalOverrides];
    }

    // TODO: we just block the whole day, but in different timezones that's different and it might affected 2 days but not the whole day
    if (!!fullDayOverrides.length) {
      const fullOverrides = fullDayOverrides.flatMap((override) => {
        return {
          userIds: override.userId ? [override.userId] : [],
          startTime: 0,
          endTime: 0,
          timeZone: override.timeZone,
          belongsToDifferentDay: false,
        };
      });
      overrides = [...overrides, ...fullOverrides];
    }
    // unset all working hours that relate to this user availability override
    overrides.forEach((override) => {
      let i = -1;
      const indexes: number[] = [];
      const inviteeUtcOffset = dayjs(inviteeDate).tz(timeZone).utcOffset();
      const scheduleUtcOffset = dayjs(inviteeDate).tz(override.timeZone).utcOffset();

      while (
        (i = computedLocalAvailability.findIndex(
          fromIndex(
            (a) => !a.userIds?.length || (!!override.userIds[0] && a.userIds?.includes(override.userIds[0])),
            i + 1
          )
        )) != -1
      ) {
        /* we still want to show time as available if:
            - override belongs to the day before or day after
            - availability is from the day day before or day after
        */
        if (!override.belongsToDifferentDay) {
          indexes.push(i);
        }
      }
      // work backwards as splice modifies the original array.
      indexes.reverse().forEach((idx) => computedLocalAvailability.splice(idx, 1));
    });
    // and push all overrides as new computed availability
    computedLocalAvailability.push(...overrides);
  }

  return buildSlots({
    computedLocalAvailability,
    startOfInviteeDay,
    startDate,
    frequency,
    eventLength,
    organizerTimeZone,
    inviteeTimeZone: timeZone,
  });
};

export default getSlots;
