export interface ScheduleAvailability {
  days: string[];
  startTime: string;
  endTime: string;
}

export interface ScheduleOverride {
  date: string;
  startTime: string;
  endTime: string;
}

export interface Schedule {
  id: number;
  ownerId: number;
  name: string;
  timeZone: string;
  availability: ScheduleAvailability[];
  isDefault: boolean;
  overrides: ScheduleOverride[];
}

export interface GetSchedulesResponse {
  status: "success";
  data: Schedule[];
}

export interface GetScheduleResponse {
  status: "success";
  data: Schedule | null;
}
