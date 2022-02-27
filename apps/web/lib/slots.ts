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
};
export type WorkingHoursTimeFrame = { startTime: number; endTime: number };

const splitAvailableTime = (
  startTimeMinutes: number,
  endTimeMinutes: number,
  frequency: number
): Array<WorkingHoursTimeFrame> => {
  let initialTime = startTimeMinutes;
  const finalizationTime = endTimeMinutes;
  const result = [] as Array<WorkingHoursTimeFrame>;
  while (initialTime < finalizationTime) {
    const periodTime = initialTime + frequency;
    result.push({ startTime: initialTime, endTime: periodTime });
    initialTime += frequency;
  }
  return result;
};

const getSlots = ({ inviteeDate, frequency, minimumBookingNotice, workingHours }: GetSlots) => {
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

  // Here we split working hour in chunks for every frequency available that can fit in whole working hour
  localWorkingHours.forEach((item, index) => {
    slotsTimeFrameAvailable.push(...splitAvailableTime(item.startTime, item.endTime, frequency));
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
