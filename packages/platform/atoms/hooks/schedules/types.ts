type ScheduleAvailability = {
  id: number;
  userId: number | null;
  eventTypeId: number | null;
  days: number[];
  startTime: Date;
  endTime: Date;
  date: Date | null;
  scheduleId: number | null;
};

type Schedule = {
  id: number;
  userId: number;
  name: string;
  timeZone: string | null;
};

type ScheduleWithAvailability = Omit<Schedule, "userId"> & {
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
