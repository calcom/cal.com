import dayjs, { Dayjs } from "@calcom/dayjs";
import { WorkingHours, TimeRange as DateOverride } from "@calcom/types/schedule";

import { getWorkingHours } from "./availability";

export type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  workingHours: WorkingHours[];
  dateOverrides?: DateOverride[];
  minimumBookingNotice: number;
  eventLength: number;
};

export type GetSlotsCompact = {
  slotDay: Dayjs;
  shiftStart: Dayjs;
  shiftEnd: Dayjs;
  days: number[];
  minStartTime: Dayjs;
  eventLength: number;
  busyTimes: { start: Dayjs; end: Dayjs }[];
};

export type TimeFrame = { startTime: number; endTime: number };

const minimumOfOne = (input: number) => (input < 1 ? 1 : input);

/**
 * TODO: What does this function do?
 * Why is it needed?
 */
const splitAvailableTime = (
  startTimeMinutes: number,
  endTimeMinutes: number,
  frequency: number,
  eventLength: number
): TimeFrame[] => {
  let initialTime = startTimeMinutes;
  const finalizationTime = endTimeMinutes;
  const result = [] as TimeFrame[];

  // Ensure that both the frequency and event length are at least 1 minute, if they
  // would be zero, we would have an infinite loop in this while!
  const frequencyMinimumOne = minimumOfOne(frequency);
  const eventLengthMinimumOne = minimumOfOne(eventLength);

  while (initialTime < finalizationTime) {
    const periodTime = initialTime + frequencyMinimumOne;
    const slotEndTime = initialTime + eventLengthMinimumOne;
    /*
    check if the slot end time surpasses availability end time of the user
    1 minute is added to round up the hour mark so that end of the slot is considered in the check instead of x9
    eg: if finalization time is 11:59, slotEndTime is 12:00, we ideally want the slot to be available
    */
    if (slotEndTime <= finalizationTime + 1) result.push({ startTime: initialTime, endTime: periodTime });
    // Ensure that both the frequency and event length are at least 1 minute, if they
    // would be zero, we would have an infinite loop in this while!
    initialTime += frequencyMinimumOne;
  }
  return result;
};

function buildSlots({
  startOfInviteeDay,
  computedLocalAvailability,
  frequency,
  eventLength,
  startDate,
}: {
  computedLocalAvailability: TimeFrame[];
  startOfInviteeDay: Dayjs;
  startDate: Dayjs;
  frequency: number;
  eventLength: number;
}) {
  const slotsTimeFrameAvailable: TimeFrame[] = [];

  computedLocalAvailability.forEach((item) => {
    slotsTimeFrameAvailable.push(...splitAvailableTime(item.startTime, item.endTime, frequency, eventLength));
  });

  const slots: Dayjs[] = [];

  slotsTimeFrameAvailable.forEach((item) => {
    // XXX: Hack alert, as dayjs is supposedly not aware of timezone the current slot may have invalid UTC offset.
    const timeZone = (startOfInviteeDay as unknown as { $x: { $timezone: string } })["$x"]["$timezone"];
    /*
     * @calcom/web:dev: 2022-11-06T00:00:00-04:00
     * @calcom/web:dev: 2022-11-06T01:00:00-04:00
     * @calcom/web:dev: 2022-11-06T01:00:00-04:00 <-- note there is no offset change, but we did lose an hour.
     * @calcom/web:dev: 2022-11-06T02:00:00-04:00
     * @calcom/web:dev: 2022-11-06T03:00:00-04:00
     * ...
     */
    let slot = dayjs.tz(
      startOfInviteeDay.add(item.startTime, "minute").format("YYYY-MM-DDTHH:mm:ss"),
      timeZone
    );
    // If the startOfInviteeDay has a different UTC offset than the slot, a DST change has occurred.
    // As the time has now fallen backwards, or forwards; this difference -
    // needs to be manually added as this is not done for us. Usually 0.
    slot = slot.add(startOfInviteeDay.utcOffset() - slot.utcOffset(), "minutes");
    // Validating slot its not on the past
    if (!slot.isBefore(startDate)) {
      slots.push(slot);
    }
  });

  return slots;
}

// Returns true if slot1 overlaps with slot2.
// Equality of startTime 1 and endTime 2 or endTime 1 and startTime 2 is NOT considered an overlap.
export function slotsOverlap(
  slot1: { startTime: Dayjs; endTime: Dayjs },
  slot2: { startTime: Dayjs; endTime: Dayjs }
) {
  return slot1.startTime.isBefore(slot2.endTime) && slot1.endTime.isAfter(slot2.startTime);
}

/**
 * This function returns the slots available for a given day.
 * `getSlots` does not take busy times into account. This is why
 * the slots that are not available must be filtered out afterwards.
 * `getSlotsCompact` takes busy times into account and returns the
 * slots as compact as possible, trying to avoid gaps between slots
 * in the calendar. For example, if the user is busy from 9:00 to
 * 09:50 and the event length is 30 minutes, the next slot will be
 * at 09:50 instead of 10:00. The 10 minutes are not lost.
 *
 * Note that the current implementation of `getSlotsCompact` only really
 * makes sense for events with a single host. We assume that `busyTimes`
 * only contains busy times for a single host.
 **/
export const getTimeSlotsCompact = ({
  // Day for which slots are being generated
  slotDay,
  // Start of the shift on that day
  shiftStart,
  // End of the shift on that day
  shiftEnd,
  // Array of integers. Days of the week that the shift is active: 0 = Sunday, 1 = Monday, etc.
  days,
  // Minimum start time of a slot (at least 2 hours from now for example)
  minStartTime,
  // Length of the event in minutes
  eventLength,
  // Array of busy times ({ startTime, endTime }) for the day
  busyTimes,
}: GetSlotsCompact): Dayjs[] => {
  if (slotDay.isBefore(minStartTime, "day")) {
    return [];
  }

  if (!days.includes(slotDay.day())) {
    return [];
  }

  const ret = [] as Dayjs[];
  let slotStartTime = shiftStart;
  let slotEndTime = slotStartTime.add(eventLength, "minute");

  while (slotEndTime.isSameOrBefore(shiftEnd)) {
    if (slotStartTime.isSameOrAfter(minStartTime)) {
      const busyTimeBlockingThisSlot = busyTimes.find((busyTime) => {
        return slotsOverlap(
          { startTime: slotStartTime, endTime: slotEndTime },
          { startTime: busyTime.start, endTime: busyTime.end }
        );
      });
      if (busyTimeBlockingThisSlot) {
        // This slot is busy, skip it.
        // Set the next startTime to the end of this busy slot.
        // The next slot will begin right after it.
        slotStartTime = busyTimeBlockingThisSlot.end;
        slotEndTime = slotStartTime.add(eventLength, "minute");
        continue;
      } else {
        ret.push(slotStartTime);
      }
    }
    slotStartTime = slotEndTime;
    slotEndTime = slotStartTime.add(eventLength, "minute");
  }
  return ret;
};

const getSlots = ({
  inviteeDate,
  frequency,
  minimumBookingNotice,
  workingHours,
  dateOverrides = [],
  eventLength,
}: GetSlots) => {
  // current date in invitee tz
  const startDate = dayjs().add(minimumBookingNotice, "minute");
  // This code is ran client side, startOf() does some conversions based on the
  // local tz of the client. Sometimes this shifts the day incorrectly.
  const startOfDayUTC = dayjs.utc().set("hour", 0).set("minute", 0).set("second", 0);
  const startOfInviteeDay = inviteeDate.startOf("day");
  // checks if the start date is in the past

  /**
   *  TODO: change "day" for "hour" to stop displaying 1 day before today
   * This is displaying a day as available as sometimes difference between two dates is < 24 hrs.
   * But when doing timezones an available day for an owner can be 2 days available in other users tz.
   *
   * */
  if (inviteeDate.isBefore(startDate, "day")) {
    return [];
  }

  // Dayjs does not expose the timeZone value publicly through .get("timeZone")
  // instead, we as devs are required to somewhat hack our way to get the ...
  // tz value as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeZone: string = (inviteeDate as any)["$x"]["$timezone"];

  // an override precedes all the local working hour availability logic.
  const activeOverrides = dateOverrides.filter((override) =>
    dayjs.utc(override.start).tz(timeZone).isSame(startOfInviteeDay, "day")
  );
  if (!!activeOverrides.length) {
    const computedLocalAvailability = activeOverrides.flatMap((override) => ({
      startTime: override.start.getUTCHours() * 60 + override.start.getUTCMinutes(),
      endTime: override.end.getUTCHours() * 60 + override.end.getUTCMinutes(),
    }));
    return buildSlots({ computedLocalAvailability, startDate, startOfInviteeDay, eventLength, frequency });
  }

  const workingHoursUTC = workingHours.map((schedule) => ({
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
  const makeTimeFrame = (item: typeof localWorkingHours[0]): TimeFrame => ({
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

  return buildSlots({ computedLocalAvailability, startOfInviteeDay, startDate, frequency, eventLength });
};

export default getSlots;
