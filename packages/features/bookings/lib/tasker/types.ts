import type { ILogger } from "@calcom/lib/tasker/types";

import { BookingSyncTasker } from "./BookingSyncTasker";
import { BookingTriggerDevTasker } from "./BookingTriggerTasker";

export interface IBookingTaskerDependencies {
  primaryTasker: BookingTriggerDevTasker | BookingSyncTasker;
  fallbackTasker: BookingSyncTasker;
  logger: ILogger;
}

export type BookingTasksPayload = {
  bookingId: number;
  conferenceCredentialId?: number;
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
};

export interface IBookingTasker {
  request(payload: BookingTasksPayload): Promise<{ runId: string }>;
  confirm(payload: BookingTasksPayload): Promise<{ runId: string }>;
  reschedule(payload: BookingTasksPayload): Promise<{ runId: string }>;
  rrReschedule(payload: BookingTasksPayload): Promise<{ runId: string }>;
}
