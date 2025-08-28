import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookSubscriber, WebhookTriggerArgs } from "../dto/types";
import type { WebhookPayload } from "../factory/types";
import type {
  BookingPaymentInitiatedParams,
  BookingCreatedParams,
  BookingCancelledParams,
  BookingRequestedParams,
  BookingRescheduledParams,
  BookingPaidParams,
  BookingNoShowParams,
  BookingRejectedParams,
  ScheduleMeetingWebhooksParams,
  CancelScheduledMeetingWebhooksParams,
  ScheduleNoShowWebhooksParams,
} from "../types/params";

export interface GetSubscribersOptions {
  userId?: number | null;
  eventTypeId?: number | null;
  triggerEvent: WebhookTriggerEvents;
  teamId?: number | number[] | null;
  orgId?: number | null;
  oAuthClientId?: string | null;
}

export interface IWebhookRepository {
  getSubscribers(options: GetSubscribersOptions): Promise<WebhookSubscriber[]>;
}

export interface IWebhookService {
  getSubscribers(options: GetSubscribersOptions): Promise<WebhookSubscriber[]>;
  processWebhooks(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscribers: WebhookSubscriber[]
  ): Promise<void>;
  scheduleTimeBasedWebhook(
    trigger: WebhookTriggerEvents,
    scheduledAt: Date,
    bookingData: any,
    subscriber: any,
    evt: Record<string, unknown>,
    isDryRun?: boolean
  ): Promise<void>;
  cancelScheduledWebhooks(
    bookingId: number,
    triggers: WebhookTriggerEvents[],
    isDryRun?: boolean
  ): Promise<void>;
  scheduleDelayedWebhooks(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    scheduledAt: Date,
    options?: { teamId?: number | number[] | null; orgId?: number | null },
    subscribers?: WebhookSubscriber[],
    isDryRun?: boolean
  ): Promise<void>;
}

export interface IBookingWebhookService {
  // Event emission from args
  emitBookingCreatedFromArgs(args: WebhookTriggerArgs): Promise<void>;
  emitBookingCancelledFromArgs(args: WebhookTriggerArgs): Promise<void>;
  emitBookingRequestedFromArgs(args: WebhookTriggerArgs): Promise<void>;
  emitBookingRescheduledFromArgs(args: WebhookTriggerArgs): Promise<void>;
  emitBookingPaidFromArgs(args: WebhookTriggerArgs): Promise<void>;

  // Direct event emission
  emitBookingPaymentInitiated(params: BookingPaymentInitiatedParams): Promise<void>;
  emitBookingCreated(params: BookingCreatedParams): Promise<void>;
  emitBookingCancelled(params: BookingCancelledParams): Promise<void>;
  emitBookingRequested(params: BookingRequestedParams): Promise<void>;
  emitBookingRescheduled(params: BookingRescheduledParams): Promise<void>;
  emitBookingPaid(params: BookingPaidParams): Promise<void>;
  emitBookingNoShow(params: BookingNoShowParams): Promise<void>;
  emitBookingRejected(params: BookingRejectedParams): Promise<void>;

  // Webhook scheduling
  scheduleMeetingWebhooks(params: ScheduleMeetingWebhooksParams): Promise<void>;
  cancelScheduledMeetingWebhooks(params: CancelScheduledMeetingWebhooksParams): Promise<void>;
  scheduleNoShowWebhooks(params: ScheduleNoShowWebhooksParams): Promise<void>;
}

export interface IFormWebhookService {
  emitFormSubmitted(params: {
    form: { id: string; name: string };
    response: { id: number; data: Record<string, unknown> };
    eventTypeId?: number | null;
    userId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void>;

  emitFormSubmittedNoEvent(params: {
    form: { id: string; name: string };
    response: { id: number; data: Record<string, unknown> };
    userId?: number | null;
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void>;

  scheduleDelayedFormWebhooks(params: {
    responseId: number;
    form: {
      id: string;
      name: string;
      teamId?: number | null;
    };
    responses: Record<string, unknown>;
    redirect?: Record<string, unknown>;
    teamId?: number | null;
    orgId?: number | null;
    delayMinutes?: number;
  }): Promise<void>;
}

export interface IRecordingWebhookService {
  emitRecordingReady(params: {
    evt: import("@calcom/types/Calendar").CalendarEvent;
    downloadLink: string;
    booking?: {
      id: number;
      eventTypeId?: number | null;
      userId?: number | null;
    };
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void>;

  emitTranscriptionGenerated(params: {
    evt: import("@calcom/types/Calendar").CalendarEvent;
    downloadLinks?: {
      transcription?: Array<{
        format: string;
        link: string;
      }>;
      recording?: string;
    };
    booking?: {
      id: number;
      eventTypeId?: number | null;
      userId?: number | null;
    };
    teamId?: number | null;
    orgId?: number | null;
    platformClientId?: string;
    isDryRun?: boolean;
  }): Promise<void>;
}
