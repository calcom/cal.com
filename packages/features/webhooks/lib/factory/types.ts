import type {
  BookingNoShowUpdatedPayload,
  DelegationCredentialErrorPayloadType,
  EventPayloadType,
  OOOEntryPayloadType,
} from "../dto/types";

export interface FormSubmittedPayload {
  formId: string;
  formName: string;
  teamId?: number | null;
  redirect?: Record<string, unknown>;
  responses: Record<string, unknown>;
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

export interface MeetingPayload {
  id: number;
  startTime: Date;
  endTime: Date;
  title: string;
  description: string | null;
  customInputs: Record<string, unknown> | null;
  responses: Record<string, unknown> | null;
  userFieldsResponses: Record<string, unknown> | null;
  location: string | null;
  status: string;
  user: {
    username: string | null;
    name: string | null;
    email: string;
    timeZone: string;
    locale: string | null;
  } | null;
  eventType: {
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
    team: {
      logoUrl: string | null;
      parent: {
        logoUrl: string | null;
        name: string;
      } | null;
    } | null;
  } | null;
  attendees: {
    name: string;
    email: string;
    timeZone: string;
  }[];
}

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

export interface WebhookPayload {
  triggerEvent: string;
  createdAt: string;
  payload:
    | EventPayloadType
    | OOOEntryPayloadType
    | BookingNoShowUpdatedPayload
    | FormSubmittedPayload
    | RecordingPayload
    | MeetingPayload
    | InstantMeetingPayload
    | NoShowWebhookPayload
    | DelegationCredentialErrorPayloadType;
}
