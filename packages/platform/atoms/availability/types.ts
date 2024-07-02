import type { Schedule as ScheduleType, TimeRange } from "@calcom/types/schedule";

export type Availability = {
  id: number;
  userId: number | null;
  eventTypeId: number | null;
  days: number[];
  startTime: string;
  endTime: Date;
  date: Date | null;
  scheduleId: number | null;
};

export type WeekdayFormat = "short" | "long";

export type AvailabilityFormValues = {
  name: string;
  schedule: ScheduleType;
  dateOverrides: { ranges: TimeRange[] }[];
  timeZone: string;
  isDefault: boolean;
};
