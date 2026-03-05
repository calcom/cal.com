import type {
  CreateEventTypeOutput_2024_06_14,
  DeleteEventTypeOutput_2024_06_14,
  GetEventTypeOutput_2024_06_14,
  GetEventTypesOutput_2024_06_14,
  UpdateEventTypeOutput_2024_06_14,
} from "../../generated/types.gen";

export type EventType = GetEventTypesOutput_2024_06_14["data"][number];
export type EventTypeResponse = GetEventTypeOutput_2024_06_14["data"];
export type CreateEventTypeResponse = CreateEventTypeOutput_2024_06_14["data"];
export type UpdateEventTypeResponse = UpdateEventTypeOutput_2024_06_14["data"];
export type DeleteEventTypeResponse = DeleteEventTypeOutput_2024_06_14["data"];
