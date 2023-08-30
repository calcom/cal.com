import type { EventType } from "./eventType";
import type { WorkingHours } from "./workingHours";

export type User = {
  email: string;
  timeZone: string;
  eventTypes: EventType[];
  workingHours: WorkingHours[];
};

export type UserList = { id: number; email?: string; username?: string }[];
