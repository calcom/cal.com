import type {
  BookingNoShowUpdatedPayload,
  DelegationCredentialErrorPayloadType,
  EventPayloadType,
  MeetingStartedDTO,
  OOOEntryPayloadType,
  WrongAssignmentReportDTO,
} from "../dto/types";

export interface FormSubmittedPayload {
  formId: string;
  formName: string;
  teamId?: number | null;
  redirect?: Record<string, unknown>;
  responses: Record<string, unknown>;
}

export interface RoutingFormFallbackHitPayload {
  formId: string;
  formName: string;
  teamId?: number | null;
  responseId: number;
  fallbackAction?: {
    type: string;
    value: string;
    eventTypeId?: number;
  };
  responses: Record<string, unknown> | null;
}

export interface RecordingPayload {
  downloadLink?: string;
  downloadLinks?: {
    transcription?: Array<{
      format: string;
      link: string;
    }>;
    recording?: string;
  };
}

/**
 * Payload for MEETING_STARTED / MEETING_ENDED webhooks.
 *
 * Uses the raw Prisma booking shape from BookingRepository.findBookingForMeetingWebhook()
 * (with getCalEventResponses applied). The flat send path spreads this as
 * `{ triggerEvent, ...booking }` to match the legacy scheduleTrigger format.
 */
export type MeetingPayload = MeetingStartedDTO["booking"];

export interface InstantMeetingPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  actions?: { action: string; title: string; type: string; image: string | null }[];
  requireInteraction?: boolean;
  type: string;
}

export interface NoShowWebhookPayload {
  bookingId: number;
  webhook: {
    id: string;
    subscriberUrl: string;
    time: number;
    timeUnit: string;
  };
}

export interface WrongAssignmentReportPayload {
  booking: WrongAssignmentReportDTO["booking"];
  report: WrongAssignmentReportDTO["report"];
}

export interface WebhookPayload {
  triggerEvent: string;
  createdAt: string;
  payload:
    | EventPayloadType
    | OOOEntryPayloadType
    | BookingNoShowUpdatedPayload
    | FormSubmittedPayload
    | RoutingFormFallbackHitPayload
    | RecordingPayload
    | MeetingPayload
    | InstantMeetingPayload
    | NoShowWebhookPayload
    | DelegationCredentialErrorPayloadType
    | WrongAssignmentReportPayload;
}
