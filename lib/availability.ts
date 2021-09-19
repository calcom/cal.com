import { Availability } from "@prisma/client";
import dayjs, { Dayjs } from "dayjs";

export type WorkingHours = Pick<Availability, "days" | "startTime" | "endTime">;

export const DEFAULT_WORKING_HOURS: WorkingHours = {
  days: [0, 1, 2, 3, 4, 5, 6],
  startTime: 0,
  endTime: 1439,
};

export const subtractWorkingHours = (workingHours) =>
  workingHours.reduce(
    (acc, workingHour) => ({
      days: acc.days.filter((day) => workingHour.days.includes(day)),
      startTime: workingHour.startTime > acc.startTime ? workingHour.startTime : acc.startTime,
      endTime: workingHour.endTime < acc.endTime ? workingHour.endTime : acc.endTime,
    }),
    DEFAULT_WORKING_HOURS
  );

export const convertToUtc = (availability: Availability, timeZone: string) => {
  // TODO: Db layer should handle this conversion, should be stored as time type.
  const start = dayjs().tz(timeZone).startOf("day").add(availability.startTime, "minutes");

  const days = availability.days.map((day) => {
    return start.day(day).utc().day();
  });

  const dayjsAsMinutes = (time: Dayjs) => time.hour() * 60 + time.minute();

  const startTime = dayjsAsMinutes(start.utc());
  const endTime = dayjsAsMinutes(
    dayjs().tz(timeZone).startOf("day").add(availability.endTime, "minutes").utc()
  );

  return {
    ...availability,
    startTime,
    days,
    endTime,
  };
};

export const convertFromUtc = (availability: Availability, timeZone: string) => {
  const start = dayjs.utc().startOf("day").add(availability.startTime, "minutes");

  const days = availability.days.map((day) => {
    return start.day(day).tz(timeZone).day();
  });

  const dayjsAsMinutes = (time: Dayjs) => time.hour() * 60 + time.minute();

  const startTime = dayjsAsMinutes(start.tz(timeZone));
  const endTime = dayjsAsMinutes(
    dayjs.utc().startOf("day").add(availability.endTime, "minutes").tz(timeZone)
  );

  return {
    ...availability,
    startTime,
    days,
    endTime,
  };
};
