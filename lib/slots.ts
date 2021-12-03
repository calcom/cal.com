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

const getMinuteOffset = (date: Dayjs, step: number) => {
  // Diffs the current time with the given date and iff same day; (handled by 1440) - return difference; otherwise 0
  const minuteOffset = Math.min(date.diff(dayjs().startOf("day"), "minute"), 1440) % 1440;
  // round down to nearest step
  return Math.ceil(minuteOffset / step) * step;
};

const getSlots = ({ inviteeDate, frequency, minimumBookingNotice, workingHours }: GetSlots) => {
  // current date in invitee tz
  let startDate = dayjs(inviteeDate).add(minimumBookingNotice, "minute");
  // checks if the start date is in the past
  if (startDate.isBefore(dayjs(), "day")) {
    return [];
  }
  // Add the current time to the startDate if the day is today
  if (startDate.isToday()) {
    startDate = startDate.add(dayjs().diff(startDate, "minute"), "minute");
  }

  const localWorkingHours = getWorkingHours(
    { utcOffset: -inviteeDate.utcOffset() },
    workingHours.map((schedule) => ({
      days: schedule.days,
      startTime: dayjs.utc().startOf("day").add(schedule.startTime, "minute"),
      endTime: dayjs.utc().startOf("day").add(schedule.endTime, "minute"),
    }))
  ).filter((hours) => hours.days.includes(inviteeDate.day()));

  const slots: Dayjs[] = [];
  for (let minutes = getMinuteOffset(startDate, frequency); minutes < 1440; minutes += frequency) {
    const slot = startDate.startOf("day").add(minutes, "minute");
    // add slots to available slots if it is found to be between the start and end time of the checked working hours.
    if (
      localWorkingHours.some((hours) =>
        slot.isBetween(
          startDate.startOf("day").add(hours.startTime, "minute"),
          startDate.startOf("day").add(hours.endTime, "minute"),
          null,
          "[)"
        )
      )
    ) {
      slots.push(slot);
    }
  }

  return slots;
};

export default getSlots;
