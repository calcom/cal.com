export type ScheduleDto = {
  id: number;
  userId: number;
  name: string;
  timeZone: string | null;
};

export type AvailabilityDto = {
  id: number;
  userId: number | null;
  eventTypeId: number | null;
  days: number[];
  startTime: Date;
  endTime: Date;
  date: Date | null;
  scheduleId: number | null;
};

export type TravelScheduleDto = {
  id: number;
  userId: number;
  timeZone: string;
  startDate: Date;
  endDate: Date | null;
};

export type ScheduleWithAvailabilityDto = ScheduleDto & {
  availability: AvailabilityDto[];
};

export type ScheduleForBuildDateRangesDto = {
  id: number;
  timeZone: string | null;
  userId: number;
  availability: Pick<AvailabilityDto, "days" | "startTime" | "endTime" | "date">[];
  user: {
    id: number;
    defaultScheduleId: number | null;
    travelSchedules: Pick<TravelScheduleDto, "id" | "timeZone" | "startDate" | "endDate">[];
  };
};

export type ScheduleForOwnershipCheckDto = {
  userId: number;
};

export type ScheduleBasicDto = {
  id: number;
  userId: number;
  name: string;
  timeZone: string | null;
  availability: AvailabilityDto[];
};

export type UserDefaultScheduleDto = {
  defaultScheduleId: number | null;
};

export type AvailabilityCreateInputDto = {
  days: number[];
  startTime: Date;
  endTime: Date;
  date?: Date | null;
};

export type ScheduleCreateInputDto = {
  name: string;
  userId: number;
  timeZone?: string | null;
  availability?: AvailabilityCreateInputDto[];
};

export type ScheduleCreatedDto = {
  id: number;
  userId: number;
  name: string;
  timeZone: string | null;
};
