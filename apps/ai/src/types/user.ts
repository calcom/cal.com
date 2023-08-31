import type { EventType } from "./eventType";
import type { WorkingHours } from "./workingHours";

export type User = {
  email: string;
  timeZone: string;
  eventTypes: EventType[];
  workingHours: WorkingHours[];
};
