export type ScheduleAvailability = {
  id: number;
  userId: number | null;
  eventTypeId: number | null;
  days: number[];
  startTime: Date;
  endTime: Date;
  date: Date | null;
  scheduleId: number | null;
};

export type Schedule = {
  id: number;
  name: string;
  timeZone: string | null;
};

export type ScheduleWithAvailability = Schedule & {
  availability: ScheduleAvailability[];
  isDefault: boolean;
};

export type CreateScheduleHandlerReturn = {
  schedule: Schedule;
};

export type DuplicateScheduleHandlerReturn = {
  schedule: Schedule;
};

export type GetAvailabilityListHandlerReturn = {
  schedules: ScheduleWithAvailability[];
};

export type CreateScheduleInput = {
  name: string;
  schedule?: { start: Date; end: Date }[][];
  eventTypeId?: number;
};
