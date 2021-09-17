import { Availability } from "@prisma/client";

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
