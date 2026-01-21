import type { PeriodType, SchedulingType } from "@calcom/prisma/enums";

export interface ValidationContext {
  eventTypeId: number;
  teamId: number | null;
  requiresConfirmation: boolean;
  minimumBookingNotice: number;
  minimumRescheduleNotice: number | null;
  seatsPerTimeSlot: number | null;
  requiresBookerEmailVerification: boolean;
  maxActiveBookingsPerBooker: number | null;
  maxActiveBookingPerBookerOfferReschedule: boolean | null;
  recurringEvent: { count?: number } | null;
}

export interface AvailabilityHost {
  readonly userId: number;
  readonly isFixed: boolean;
  readonly priority: number | null;
  readonly weight: number | null;
  readonly groupId: string | null;
}

export interface AvailabilityContext {
  eventTypeId: number;
  schedulingType: SchedulingType | null;
  hosts: ReadonlyArray<AvailabilityHost>;
  duration: number;
  periodType: PeriodType | null;
  periodDays: number | null;
  periodStartDate: Date | null;
  periodEndDate: Date | null;
  rescheduleWithSameRoundRobinHost: boolean;
  assignAllTeamMembers: boolean;
  isRRWeightsEnabled: boolean;
  beforeEventBuffer: number;
  afterEventBuffer: number;
}

export interface CalendarEventContext {
  title: string;
  description: string | null;
  length: number;
  eventName: string | null;
  hideCalendarNotes: boolean;
  hideCalendarEventDetails: boolean;
  hideOrganizerEmail: boolean;
  timeZone: string | null;
}

export interface PostProcessContext {
  eventTypeId: number;
  teamId: number | null;
  price: number;
  currency: string;
}

export interface BookerInfo {
  readonly email: string;
  readonly name: string | { firstName: string; lastName?: string };
  readonly timeZone: string;
  readonly language: string;
  readonly rescheduleUid: string | null;
  readonly smsReminderNumber: string | null;
  readonly attendeePhoneNumber: string | null;
}

export interface RequestedSlot {
  readonly start: string;
  readonly end: string;
  readonly timeZone: string;
}
