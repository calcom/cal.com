import { Availability } from "@prisma/client";

export type TimeRange = {
  start: Date;
  end: Date;
};

export type Schedule = TimeRange[][];

export type WorkingHours = Pick<Availability, "days" | "startTime" | "endTime">;
