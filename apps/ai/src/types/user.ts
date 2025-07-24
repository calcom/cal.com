import type { EventType } from "./eventType";
import type { WorkingHours } from "./workingHours";

export type User = {
  id: number;
  email: string;
  username: string;
  timeZone: string;
  eventTypes: EventType[];
  workingHours: WorkingHours[];
};

export type UserList = {
  id?: number;
  email?: string;
  username?: string;
  type: "fromUsername" | "fromEmail";
}[];
