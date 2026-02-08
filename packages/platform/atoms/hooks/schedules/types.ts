type Schedule = {
  id: number;
  userId: number;
  name: string;
  timeZone: string | null;
};

export type CreateScheduleHandlerReturn = {
  schedule: Schedule;
};

export type DuplicateScheduleHandlerReturn = {
  schedule: Schedule;
};

export type GetAvailabilityListHandlerReturn = {
  schedules: (Omit<Schedule, "userId"> & {
    availability: {
      id: number;
      userId: number | null;
      eventTypeId: number | null;
      days: number[];
      startTime: Date;
      endTime: Date;
      date: Date | null;
      scheduleId: number | null;
    }[];
    isDefault: boolean;
  })[];
};

export type CreateScheduleInput = {
  name: string;
  schedule?: { start: Date; end: Date }[][];
  eventTypeId?: number;
};
