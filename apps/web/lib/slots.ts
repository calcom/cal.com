import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import isToday from "dayjs/plugin/isToday";
import utc from "dayjs/plugin/utc";

import { getWorkingHours } from "./availability";
import { WorkingHours } from "./types/schedule";

dayjs.extend(isToday);
dayjs.extend(utc);
dayjs.extend(isBetween);

export type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  workingHours: WorkingHours[];
  minimumBookingNotice: number;
  eventLength: number;
};
export type WorkingHoursTimeFrame = { startTime: number; endTime: number };

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
  const startOfDay = dayjs.utc().startOf("day");
  const startOfInviteeDay = inviteeDate.startOf("day");
  // checks if the start date is in the past
  if (inviteeDate.isBefore(startDate, "day")) {
    return [];
  }

  const localWorkingHours = getWorkingHours(
    { utcOffset: -inviteeDate.utcOffset() },
    workingHours.map((schedule) => ({
      days: schedule.days,
      startTime: startOfDay.add(schedule.startTime, "minute"),
      endTime: startOfDay.add(schedule.endTime, "minute"),
    }))
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
  return slots;
};

export default getSlots;
