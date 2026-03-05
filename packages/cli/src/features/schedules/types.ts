import type {
  GetScheduleOutput_2024_06_11,
  GetSchedulesOutput_2024_06_11,
} from "../../generated/types.gen";

export type Schedule = GetSchedulesOutput_2024_06_11["data"][number];
export type ScheduleDetail = GetScheduleOutput_2024_06_11["data"];
