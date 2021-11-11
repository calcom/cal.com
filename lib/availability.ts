import { Availability } from "@prisma/client";

import { Schedule, TimeRange } from "./types/schedule";

// sets the desired time in current date, needs to be current date for proper DST translation
export const defaultDayRange: TimeRange = {
  start: new Date(new Date().setHours(9, 0, 0, 0)),
  end: new Date(new Date().setHours(17, 0, 0, 0)),
};

export const DEFAULT_SCHEDULE: Schedule = [
  [],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [defaultDayRange],
  [],
];

export function getAvailabilityFromSchedule(schedule: Schedule): Availability[] {
  return schedule.reduce((availability: Availability[], times: TimeRange[], day: number) => {
    const addNewTime = (time: TimeRange) =>
      ({
        days: [day],
        startTime: time.start,
        endTime: time.end,
      } as Availability);

    const filteredTimes = times.filter((time) => {
      let idx;
      if (
        (idx = availability.findIndex(
          (schedule) => schedule.startTime === time.start && schedule.endTime === time.end
        )) !== -1
      ) {
        availability[idx].days.push(day);
        return false;
      }
      return true;
    });
    filteredTimes.forEach((time) => {
      availability.push(addNewTime(time));
    });
    return availability;
  }, [] as Availability[]);
}
