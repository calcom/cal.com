import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import utc from "dayjs/plugin/utc";

import { getWorkingHours } from "./availability";
import { WorkingHours } from "./types/schedule";

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
  const minuteOffset = Math.min(date.diff(dayjs().startOf("day"), "minutes"), 1440) % 1440;
  // round down to nearest step
  return Math.floor(minuteOffset / step) * step;
};

const getSlots = ({ inviteeDate, frequency, minimumBookingNotice, workingHours }: GetSlots) => {
  // current date in invitee tz
  const startDate = dayjs(inviteeDate).add(minimumBookingNotice, "minutes"); // + minimum notice period
  // checks if the start date is in the past
  if (startDate.isBefore(dayjs(), "day")) {
    return [];
  }

  const localWorkingHours = getWorkingHours(
    { utcOffset: -inviteeDate.utcOffset() },
    workingHours.map((schedule) => ({
      days: schedule.days,
      startTime: dayjs.utc().startOf("day").add(schedule.startTime, "minutes"),
      endTime: dayjs.utc().startOf("day").add(schedule.endTime, "minutes"),
    }))
  ).filter((hours) => hours.days.includes(inviteeDate.day()));

  const slots: Dayjs[] = [];
  for (let minutes = getMinuteOffset(inviteeDate, frequency); minutes < 1440; minutes += frequency) {
    const slot = inviteeDate.startOf("day").add(minutes, "minutes");
    // add slots to available slots if it is found to be between the start and end time of the checked working hours.
    if (
      localWorkingHours.some((hours) =>
        slot.isBetween(
          inviteeDate.startOf("day").add(hours.startTime, "minutes"),
          inviteeDate.startOf("day").add(hours.endTime, "minutes"),
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
