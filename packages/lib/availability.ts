import dayjs, { ConfigType } from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";

import type { Availability } from "@calcom/prisma/client";
import type { Schedule, TimeRange, WorkingHours } from "@calcom/types/schedule";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);
// sets the desired time in current date, needs to be current date for proper DST translation
export const defaultDayRange: TimeRange = {
  start: new Date(new Date().setUTCHours(9, 0, 0, 0)),
  end: new Date(new Date().setUTCHours(17, 0, 0, 0)),
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

export const MINUTES_IN_DAY = 60 * 24;
export const MINUTES_DAY_END = MINUTES_IN_DAY - 1;
export const MINUTES_DAY_START = 0;

/**
 * Allows "casting" availability (days, startTime, endTime) given in UTC to a timeZone or utcOffset
 */
export function getWorkingHours(
  relativeTimeUnit: {
    timeZone?: string;
    utcOffset?: number;
  },
  availability: { days: number[]; startTime: ConfigType; endTime: ConfigType }[]
) {
  // clearly bail when availability is not set, set everything available.
  if (!availability.length) {
    return [
      {
        days: [0, 1, 2, 3, 4, 5, 6],
        // shorthand for: dayjs().startOf("day").tz(timeZone).diff(dayjs.utc().startOf("day"), "minutes")
        startTime: MINUTES_DAY_START,
        endTime: MINUTES_DAY_END,
      },
    ];
  }

  const utcOffset = relativeTimeUnit.utcOffset ?? dayjs().tz(relativeTimeUnit.timeZone).utcOffset();

  const workingHours = availability.reduce((workingHours: WorkingHours[], schedule) => {
    // Get times localised to the given utcOffset/timeZone
    const startTime =
      dayjs.utc(schedule.startTime).get("hour") * 60 +
      dayjs.utc(schedule.startTime).get("minute") -
      utcOffset;
    const endTime =
      dayjs.utc(schedule.endTime).get("hour") * 60 + dayjs.utc(schedule.endTime).get("minute") - utcOffset;

    // add to working hours, keeping startTime and endTimes between bounds (0-1439)
    const sameDayStartTime = Math.max(MINUTES_DAY_START, Math.min(MINUTES_DAY_END, startTime));
    const sameDayEndTime = Math.max(MINUTES_DAY_START, Math.min(MINUTES_DAY_END, endTime));
    if (sameDayStartTime !== sameDayEndTime) {
      workingHours.push({
        days: schedule.days,
        startTime: sameDayStartTime,
        endTime: sameDayEndTime,
      });
    }
    // check for overflow to the previous day
    if (startTime < MINUTES_DAY_START || endTime < MINUTES_DAY_START) {
      workingHours.push({
        days: schedule.days.map((day) => day - 1),
        startTime: startTime + MINUTES_IN_DAY,
        endTime: Math.min(endTime + MINUTES_IN_DAY, MINUTES_DAY_END),
      });
    }
    // else, check for overflow in the next day
    else if (startTime > MINUTES_DAY_END || endTime > MINUTES_DAY_END) {
      workingHours.push({
        days: schedule.days.map((day) => day + 1),
        startTime: Math.max(startTime - MINUTES_IN_DAY, MINUTES_DAY_START),
        endTime: endTime - MINUTES_IN_DAY,
      });
    }

    return workingHours;
  }, []);

  workingHours.sort((a, b) => a.startTime - b.startTime);

  return workingHours;
}
