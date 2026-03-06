import type {
  CreateEventTypeOutput_2024_06_14,
  DeleteEventTypeOutput_2024_06_14,
  GetEventTypeOutput_2024_06_14,
  GetEventTypesOutput_2024_06_14,
  UpdateEventTypeOutput_2024_06_14,
} from "../../generated/types.gen";

// List endpoint returns only user event types
export type EventType = GetEventTypesOutput_2024_06_14["data"][number];
export type EventTypeList = GetEventTypesOutput_2024_06_14["data"];

// Get-by-ID can return user OR team event types
export type EventTypeResponse = GetEventTypeOutput_2024_06_14["data"];
export type CreateEventTypeResponse = CreateEventTypeOutput_2024_06_14["data"];
export type UpdateEventTypeResponse = UpdateEventTypeOutput_2024_06_14["data"];
export type DeleteEventTypeResponse = DeleteEventTypeOutput_2024_06_14["data"];
