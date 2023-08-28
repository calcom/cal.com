import type { EventType } from "./eventType";
import type { WorkingHours } from "./workingHours";

export type User = {
  userIdHashed: string;
  userIdIV: string;
  email: string;
  timeZone: string;
  apiKeyHashed: string;
  apiKeyIV: string;
  eventTypes: EventType[];
  workingHours: WorkingHours[];
};
