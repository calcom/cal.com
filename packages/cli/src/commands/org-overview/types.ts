import type {
  GetSchedulesOutput_2024_06_11,
  ScheduleOutput_2024_06_11,
  UserOooOutputDto,
  UserOoosOutputResponseDto,
} from "../../generated/types.gen";

export type OrgOooEntry = UserOooOutputDto;
export type OrgOooListResponse = UserOoosOutputResponseDto;

export type OrgSchedule = ScheduleOutput_2024_06_11;
export type OrgSchedulesResponse = GetSchedulesOutput_2024_06_11;
