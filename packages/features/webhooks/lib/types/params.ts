import type { CalendarEvent } from "@calcom/types/Calendar";

/**
 * Parameter type definitions for webhook service methods
 */

export interface BookingCreatedParams {
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    startTime?: Date;
    smsReminderNumber?: string | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  };
  status?: "ACCEPTED" | "PENDING";
  metadata?: Record<string, unknown>;
  platformParams?: {
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
  };
  platformClientId?: string;
  teamId?: number | null;
  orgId?: number | null;
  isDryRun?: boolean;
}

export interface BookingCancelledParams {
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  };
  cancelledBy?: string;
  cancellationReason?: string;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
}

export interface BookingRequestedParams {
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  };
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
}

export interface BookingRescheduledParams {
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  };
  rescheduleId?: number;
  rescheduleUid?: string;
  rescheduleStartTime?: string;
  rescheduleEndTime?: string;
  rescheduledBy?: string;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
}

export interface BookingPaidParams {
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  };
  paymentId?: number;
  paymentData?: Record<string, unknown>;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
}

export interface BookingPaymentInitiatedParams {
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  };
  paymentId?: number;
  paymentData?: Record<string, unknown>;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
}

export interface BookingNoShowParams {
  message: string;
  bookingUid: string;
  bookingId?: number;
  attendees: { email: string; noShow: boolean }[];
  userId?: number | null;
  eventTypeId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
}

export interface BookingRejectedParams {
  evt: CalendarEvent;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  };
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    teamId?: number | null;
  };
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
}

export interface ScheduleMeetingWebhooksParams {
  booking: {
    id: number;
    uid: string;
    eventTypeId: number | null;
    userId: number | null;
    startTime: Date;
    endTime: Date;
    responses?: Record<string, unknown>;
  };
  evt: CalendarEvent;
  teamId?: number | null;
  orgId?: number | null;
  oAuthClientId?: string;
  isDryRun?: boolean;
}

export interface CancelScheduledMeetingWebhooksParams {
  bookingId: number;
  isDryRun?: boolean;
}

export interface ScheduleNoShowWebhooksParams {
  booking: {
    id: number;
    startTime: Date;
    eventTypeId: number | null;
    userId: number | null;
    uid: string;
  };
  organizerUser: {
    id: number;
    username: string | null;
  };
  eventType?: {
    teamId?: number | null;
  };
  teamId?: number | null;
  orgId?: number | null;
  oAuthClientId?: string;
  triggerForUser?: boolean;
}
