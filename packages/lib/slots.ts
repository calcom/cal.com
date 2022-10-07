import dayjs, { Dayjs } from "@calcom/dayjs";
import { WorkingHours } from "@calcom/types/schedule";

import { getWorkingHours } from "./availability";

export type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  workingHours: WorkingHours[];
  minimumBookingNotice: number;
  eventLength: number;
};
export type WorkingHoursTimeFrame = { startTime: number; endTime: number };

/**
 * TODO: What does this function do?
 * Why is it needed?
 */
const splitAvailableTime = (
  startTimeMinutes: number,
  endTimeMinutes: number,
  frequency: number,
  eventLength: number
): Array<WorkingHoursTimeFrame> => {
  let initialTime = startTimeMinutes;
  const finalizationTime = endTimeMinutes;
  const result = [] as Array<WorkingHoursTimeFrame>;
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

const getSlots = ({ inviteeDate, frequency, minimumBookingNotice, workingHours, eventLength }: GetSlots) => {
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

  const workingHoursUTC = workingHours.map((schedule) => ({
    days: schedule.days,
    startTime: /* Why? */ startOfDayUTC.add(schedule.startTime, "minute"),
    endTime: /* Why? */ startOfDayUTC.add(schedule.endTime, "minute"),
  }));

  // Dayjs does not expose the timeZone value publicly through .get("timeZone")
  // instead, we as devs are required to somewhat hack our way to get the ...
  // tz value as string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const timeZone: string = (inviteeDate as any)["$x"]["$timezone"];

  const localWorkingHours = getWorkingHours(
    {
      // initialize current day with timeZone without conversion, just parse.
      utcOffset: -dayjs.tz(dayjs(), timeZone).utcOffset(),
    },
    workingHoursUTC
  ).filter((hours) => hours.days.includes(inviteeDate.day()));

  const slots: Dayjs[] = [];

  const slotsTimeFrameAvailable = [] as Array<WorkingHoursTimeFrame>;
  // Here we split working hour in chunks for every frequency available that can fit in whole working hours
  const computedLocalWorkingHours: WorkingHoursTimeFrame[] = [];
  let tempComputeTimeFrame: WorkingHoursTimeFrame | undefined;
  const computeLength = localWorkingHours.length - 1;
  const makeTimeFrame = (item: typeof localWorkingHours[0]): WorkingHoursTimeFrame => ({
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
        computedLocalWorkingHours.push(tempComputeTimeFrame);
        tempComputeTimeFrame = makeTimeFrame(item);
      }
    }
    if (index == computeLength) {
      computedLocalWorkingHours.push(tempComputeTimeFrame);
    }
  });
  computedLocalWorkingHours.forEach((item) => {
    slotsTimeFrameAvailable.push(...splitAvailableTime(item.startTime, item.endTime, frequency, eventLength));
  });

  slotsTimeFrameAvailable.forEach((item) => {
    const slot = startOfInviteeDay.add(item.startTime, "minute");
    // Validating slot its not on the past
    if (!slot.isBefore(startDate)) {
      slots.push(slot);
    }
  });

  const uniq = (a: Dayjs[]) => {
    const seen: Record<string, boolean> = {};
    return a.filter((item) => {
      return seen.hasOwnProperty(item.format()) ? false : (seen[item.format()] = true);
    });
  };

  return uniq(slots);
};

export default getSlots;
