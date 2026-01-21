import type { EmailsAndSmsSideEffectsPayload } from "@calcom/features/bookings/lib/BookingEmailSmsHandler";

export type BookingEmailAndSmsTaskPayload = {
  bookingId: number;
  conferenceCredentialId?: number;
  platformClientId?: string;
  platformRescheduleUrl?: string;
  platformCancelUrl?: string;
  platformBookingUrl?: string;
  isRescheduledByBooker?: boolean;
};

export type BookingEmailAndSmsSyncSendPayload = EmailsAndSmsSideEffectsPayload;

export type BookingEmailAndSmsAsyncTasksPayload = BookingEmailAndSmsTaskPayload;

export interface IBookingEmailAndSmsTasker {
  request(payload: BookingEmailAndSmsAsyncTasksPayload): Promise<{ runId: string }>;
  confirm(payload: BookingEmailAndSmsAsyncTasksPayload): Promise<{ runId: string }>;
  reschedule(payload: BookingEmailAndSmsAsyncTasksPayload): Promise<{ runId: string }>;
  rrReschedule(payload: BookingEmailAndSmsAsyncTasksPayload): Promise<{ runId: string }>;
}

type WithVoidReturns<T> = {
  // Loop over every key 'K' in the type 'T'
  [K in keyof T]: T[K] extends (...args: infer P) => unknown // Check if the property is a function
    ? // If yes, create a new function with original parameters 'P' and 'void' return
      (...args: P) => void
    : // If not a function, keep the original type
      T[K];
};

export type BookingTasks = WithVoidReturns<IBookingEmailAndSmsTasker>;
