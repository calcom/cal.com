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

const getMinuteOffset = (date: Dayjs, frequency: number) => {
  // Diffs the current time with the given date and iff same day; (handled by 1440) - return difference; otherwise 0
  const minuteOffset = Math.min(date.diff(dayjs().utc(), "minute"), 1440) % 1440;
  // round down to nearest step
  return Math.ceil(minuteOffset / frequency) * frequency;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const getSlots = ({ inviteeDate, frequency, minimumBookingNotice, workingHours }: GetSlots) => {
  // current date in invitee tz
  const startDate = dayjs().add(minimumBookingNotice, "minute");
  // checks if the start date is in the past
  if (inviteeDate.isBefore(startDate, "day")) {
    return [];
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
  for (let minutes = getMinuteOffset(inviteeDate, frequency); minutes < 1440; minutes += frequency) {
    const slot = dayjs(inviteeDate).startOf("day").add(minutes, "minute");
    // check if slot happened already
    if (slot.isBefore(startDate)) {
      continue;
    }
    // add slots to available slots if it is found to be between the start and end time of the checked working hours.
    if (
      localWorkingHours.some((hours) =>
        slot.isBetween(
          inviteeDate.startOf("day").add(hours.startTime, "minute"),
          inviteeDate.startOf("day").add(hours.endTime, "minute"),
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
