import type { DateRange } from "@calcom/features/schedules/lib/date-ranges";
import type { EventBusyDetails } from "@calcom/types/Calendar";

export type GuestBusyTimes = {
  busy: EventBusyDetails[];
};

export type UserAvailabilityInitialData = {
  eventType?: {
    id: number;
    hosts?: { userId: number; user: { email: string } }[];
    users?: { id: number; email: string }[];
    schedulingType?: string | null;
  } | null;
  user?: {
    id: number;
    email: string;
    timeZone: string;
  } | null;
  rescheduleUid?: string | null;
  busyTimesFromLimitsBookings?: EventBusyDetails[];
  guestBusyTimes?: GuestBusyTimes["busy"];
};

export type GetUserAvailabilityInitialData = UserAvailabilityInitialData & {
  user: NonNullable<UserAvailabilityInitialData["user"]>;
  eventType: NonNullable<UserAvailabilityInitialData["eventType"]>;
};