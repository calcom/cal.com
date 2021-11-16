import { Availability } from "@prisma/client";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import { Schedule, TimeRange, WorkingHours } from "./types/schedule";

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

  const workingHours = availability.reduce((workingHours: WorkingHours[], schedule) => {
    const startTime = dayjs
      .utc(dayjs.utc(schedule.startTime).format("HH:mm:ss"), "HH:mm:ss")
      .tz(timeZone, true)
      .diff(dayjs.utc().startOf("day"), "minutes");
    const endTime = dayjs
      .utc(dayjs.utc(schedule.endTime).format("HH:mm:ss"), "HH:mm:ss")
      .tz(timeZone, true)
      .diff(dayjs.utc().startOf("day"), "minutes");
    // add to working hours, keeping startTime and endTimes between bounds (0-1439)
    workingHours.push({
      days: schedule.days,
      startTime: Math.max(0, Math.min(1439, startTime)),
      endTime: Math.max(0, Math.min(1439, endTime)),
    });
    // check for overflow to the previous day
    if (startTime < 0 || endTime < 0) {
      workingHours.push({
        days: schedule.days.map((day) => day - 1),
        startTime,
        endTime: Math.min(endTime + 1440, 1439),
      });
    }
    // else, check for overflow in the next day
    else if (startTime > 1439 || endTime > 1439) {
      workingHours.push({
        days: schedule.days.map((day) => day + 1),
        startTime: Math.max(startTime - 1439, 0),
        endTime: endTime - 1439,
      });
    }
    return workingHours;
  }, []);

  workingHours.sort((a, b) => a.startTime - b.startTime);

  return workingHours;
}
