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
export type TimeFrame = { startTime: number; endTime: number };

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
  while (initialTime < finalizationTime) {
    const periodTime = initialTime + frequency;
    const slotEndTime = initialTime + eventLength;
    /*
    check if the slot end time surpasses availability end time of the user
    1 minute is added to round up the hour mark so that end of the slot is considered in the check instead of x9
    eg: if finalization time is 11:59, slotEndTime is 12:00, we ideally want the slot to be available
    */
    if (slotEndTime <= finalizationTime + 1) result.push({ startTime: initialTime, endTime: periodTime });
    initialTime += frequency;
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
