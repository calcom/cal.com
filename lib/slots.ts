import dayjs, { Dayjs } from "dayjs";
import utc from "dayjs/plugin/utc";

import { OpeningHours } from "@lib/types/event-type";

dayjs.extend(utc);

export type GetSlots = {
  inviteeDate: Dayjs;
  frequency: number;
  workingHours: OpeningHours[];
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
  const startDate = inviteeDate.add(minimumBookingNotice, "minutes"); // + minimum notice period
  // checks if the start date is in the past
  if (startDate.isBefore(dayjs(), "day")) {
    return [];
  }
  // only fetches relevant working hours; the one on the same day as the day being checked
  const thisDayWorkingHours = workingHours.filter((hours) =>
    hours.days.includes(dayjs(inviteeDate).utc().get("day"))
  );

  const slots: Dayjs[] = [];
  for (let minutes = getMinuteOffset(inviteeDate, frequency); minutes < 1440; minutes += frequency) {
    const slot = inviteeDate.startOf("day").add(minutes, "minutes");
    // add slots to available slots if it is found to be between the start and end time of the checked working hours.
    if (thisDayWorkingHours.some((hours) => slot.isBetween(hours.startTime, hours.endTime, null, "[)"))) {
      slots.push(slot);
    }
  }
  return slots;
};

export default getSlots;
