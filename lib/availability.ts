import { Availability } from "@prisma/client";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { Schedule, TimeRange } from "./types/schedule";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
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

/**
 * PostgreSQL stores the date relatively
 */
export function getWorkingHours(
  timeZone: string,
  availability: Pick<Availability, "days" | "startTime" | "endTime">[]
) {
  // clearly bail when availability is not set, set everything available.
  if (!availability.length) {
    return [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        // shorthand for: dayjs().startOf("day").tz(timeZone).diff(dayjs.utc().startOf("day"), "minutes")
        startTime: 0,
        endTime: 1439,
      },
    ];
  }

  const workingHours = availability.map((schedule) => ({
    days: schedule.days,
    startTime: dayjs
      .utc(dayjs.utc(schedule.startTime).format("HH:mm:ss"), "HH:mm:ss")
      .tz(timeZone, true)
      .diff(dayjs.utc().startOf("day"), "minutes"),
    endTime: dayjs
      .utc(dayjs.utc(schedule.endTime).format("HH:mm:ss"), "HH:mm:ss")
      .tz(timeZone, true)
      .diff(dayjs.utc().startOf("day"), "minutes"),
  }));

  workingHours.sort((a, b) => a.startTime - b.startTime);

  return workingHours;
}
