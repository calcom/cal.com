import { EmailsAndSmsSideEffectsPayload } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";
import type { ILogger } from "@calcom/lib/tasker/types";

import { BookingSyncTasker } from "./BookingSyncTasker";
import { BookingTriggerDevTasker } from "./BookingTriggerTasker";

export interface IBookingTaskerDependencies {
  primaryTasker: BookingTriggerDevTasker | BookingSyncTasker;
  fallbackTasker: BookingSyncTasker;
  logger: ILogger;
}

export type BookingTaskPayload = {
  bookingId: number;
  conferenceCredentialId?: number;
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
};

export type BookingSyncSendPayload = EmailsAndSmsSideEffectsPayload;

export type BookingAsyncTasksPayload = BookingTaskPayload;

export interface IBookingTasker {
  request(payload: BookingAsyncTasksPayload): Promise<{ runId: string }>;
  confirm(payload: BookingAsyncTasksPayload): Promise<{ runId: string }>;
  reschedule(payload: BookingAsyncTasksPayload): Promise<{ runId: string }>;
  rrReschedule(payload: BookingAsyncTasksPayload): Promise<{ runId: string }>;
}

type WithVoidReturns<T> = {
  // Loop over every key 'K' in the type 'T'
  [K in keyof T]: T[K] extends (...args: infer P) => unknown // Check if the property is a function
    ? // If yes, create a new function with original parameters 'P' and 'void' return
      (...args: P) => void
    : // If not a function, keep the original type
      T[K];
};

export type BookingTasks = WithVoidReturns<IBookingTasker>;
