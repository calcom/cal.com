import type { TGetTranscriptAccessLink } from "@calcom/app-store/dailyvideo/zod";
import type { FORM_SUBMITTED_WEBHOOK_RESPONSES } from "@calcom/app-store/routing-forms/lib/formSubmissionUtils";
import type { TimeUnit, WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { WebhookVersion } from "../interface/IWebhookRepository";
import type { CalendarEvent, Person } from "@calcom/types/Calendar";

export interface BaseEventDTO {
  triggerEvent: WebhookTriggerEvents;
  createdAt: string;
  bookingId?: number;
  eventTypeId?: number | null;
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string | null;
}

export interface BookingCreatedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_CREATED;
  evt: CalendarEvent;
  eventType: EventTypeInfo & {
    id: number;
  };
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    startTime: Date;
    smsReminderNumber?: string | null;
  };
  status: "ACCEPTED" | "PENDING";
  metadata?: Record<string, unknown>;
  platformParams?: {
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
  };
}

export interface BookingCancelledDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_CANCELLED;
  evt: CalendarEvent;
  eventType: EventTypeInfo & {
    id: number;
  };
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
    iCalSequence?: number | null;
  };
  cancelledBy?: string;
  cancellationReason?: string;
  requestReschedule?: boolean;
}

export interface BookingRejectedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_REJECTED;
  evt: CalendarEvent;
  eventType: EventTypeInfo & {
    id: number;
  };
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  };
  status: string;
}

export interface BookingRequestedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_REQUESTED;
  evt: CalendarEvent;
  eventType: EventTypeInfo & {
    id: number;
  };
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
}

export interface BookingRescheduledDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_RESCHEDULED;
  evt: CalendarEvent;
  eventType: EventTypeInfo & {
    id: number;
  };
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  };
  rescheduleId?: number;
  rescheduleUid?: string;
  rescheduleStartTime?: string;
  rescheduleEndTime?: string;
  rescheduledBy?: string;
}

export interface BookingPaidDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_PAID;
  evt: CalendarEvent;
  eventType: EventTypeInfo & {
    id: number;
  };
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
  paymentId?: number;
  paymentData?: Record<string, unknown>;
}

export interface BookingPaymentInitiatedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED;
  evt: CalendarEvent;
  eventType: EventTypeInfo & {
    id: number;
  };
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
  paymentId?: number;
  paymentData?: Record<string, unknown>;
}

export interface BookingNoShowDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED;
  message: string;
  bookingUid: string;
  bookingId?: number;
  attendees: { email: string; noShow: boolean }[];
}

export interface OOOCreatedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.OOO_CREATED;
  oooEntry: {
    id: number;
    start: string;
    end: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    reason: {
      emoji?: string;
      reason?: string;
    };
    reasonId: number;
    user: {
      id: number;
      name: string | null;
      username: string | null;
      timeZone: string;
      email: string;
    };
    toUser: {
      id: number;
      name?: string | null;
      username?: string | null;
      timeZone?: string;
      email?: string;
    } | null;
    uuid: string;
  };
}

export interface FormSubmittedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.FORM_SUBMITTED;
  form: {
    id: string;
    name: string;
  };
  response: {
    id: number;
    data: FORM_SUBMITTED_WEBHOOK_RESPONSES;
  };
}

export interface RecordingReadyDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.RECORDING_READY;
  evt: CalendarEvent;
  downloadLink: string;
}

export interface TranscriptionGeneratedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.RECORDING_TRANSCRIPTION_GENERATED;
  evt: CalendarEvent;
  downloadLinks?: {
    transcription?: Array<{
      format: string;
      link: string;
    }>;
    recording?: string;
  };
}

export interface FormSubmittedNoEventDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT;
  form: {
    id: string;
    name: string;
  };
  response: {
    id: number;
    data: FORM_SUBMITTED_WEBHOOK_RESPONSES;
  };
}

export interface MeetingStartedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.MEETING_STARTED;
  booking: {
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
  };
}

export interface MeetingEndedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.MEETING_ENDED;
  booking: {
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
  };
}

export interface InstantMeetingDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.INSTANT_MEETING;
  title: string;
  body: string;
  icon?: string;
  url?: string;
  actions?: { action: string; title: string; type: string; image: string | null }[];
  requireInteraction?: boolean;
  type: string;
}

export interface AfterHostsNoShowDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.AFTER_HOSTS_CAL_VIDEO_NO_SHOW;
  bookingId: number;
  webhook: {
    id: string;
    subscriberUrl: string;
    time: number;
    timeUnit: string;
  };
}

export interface AfterGuestsNoShowDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.AFTER_GUESTS_CAL_VIDEO_NO_SHOW;
  bookingId: number;
  webhook: {
    id: string;
    subscriberUrl: string;
    time: number;
    timeUnit: string;
  };
}

export interface DelegationCredentialErrorDTO
  extends BaseEventDTO,
    Pick<DelegationCredentialErrorPayloadType, "error" | "credential" | "user"> {
  triggerEvent: typeof WebhookTriggerEvents.DELEGATION_CREDENTIAL_ERROR;
}

export type WebhookEventDTO =
  | BookingCreatedDTO
  | BookingCancelledDTO
  | BookingRejectedDTO
  | BookingRequestedDTO
  | BookingRescheduledDTO
  | BookingPaidDTO
  | BookingPaymentInitiatedDTO
  | BookingNoShowDTO
  | OOOCreatedDTO
  | FormSubmittedDTO
  | FormSubmittedNoEventDTO
  | RecordingReadyDTO
  | TranscriptionGeneratedDTO
  | MeetingStartedDTO
  | MeetingEndedDTO
  | InstantMeetingDTO
  | AfterHostsNoShowDTO
  | AfterGuestsNoShowDTO
  | DelegationCredentialErrorDTO;

// Service layer interfaces
export interface WebhookTriggerArgs {
  trigger: WebhookTriggerEvents;
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
  } | null;
  teamId?: number | null;
  orgId?: number | null;
  platformClientId?: string;
  isDryRun?: boolean;
  status?: "ACCEPTED" | "PENDING";
  metadata?: Record<string, unknown>;
  platformParams?: {
    platformClientId?: string;
    platformRescheduleUrl?: string;
    platformCancelUrl?: string;
    platformBookingUrl?: string;
  };
  cancelledBy?: string;
  cancellationReason?: string;
  rescheduleId?: number;
  rescheduleUid?: string;
  rescheduleStartTime?: string;
  rescheduleEndTime?: string;
  rescheduledBy?: string;
  paymentId?: number;
  paymentData?: Record<string, unknown>;
}

/**
 * Full webhook entity - used for CRUD operations and UI display
 * Contains all fields needed for webhook management
 */
export interface Webhook {
  id: string;
  subscriberUrl: string;
  payloadTemplate: string | null;
  appId: string | null;
  secret: string | null;
  active: boolean;
  eventTriggers: WebhookTriggerEvents[];
  eventTypeId: number | null;
  teamId: number | null;
  userId: number | null;
  time: number | null;
  timeUnit: TimeUnit | null;
  version: WebhookVersion;
  createdAt: Date;
  platform: boolean;
  platformOAuthClientId: string | null;
}

/**
 * Webhook subscriber - minimal type for webhook delivery/payload sending
 * Subset of Webhook with only fields needed for triggering webhooks
 */
export interface WebhookSubscriber {
  id: string;
  subscriberUrl: string;
  payloadTemplate: string | null;
  appId: string | null;
  secret: string | null;
  time?: number | null;
  timeUnit?: TimeUnit | null;
  eventTriggers: WebhookTriggerEvents[];
  version: WebhookVersion;
}

export interface WebhookDeliveryResult {
  ok: boolean;
  status: number;
  message?: string;
  duration?: number;
  subscriberUrl: string;
  webhookId: string;
}

/**
 * Payment data associated with webhook events
 * Used when sending booking payment webhooks
 */
export interface PaymentData {
  id: number;
  fee: number;
  currency: string;
  success: boolean;
  refunded: boolean;
  externalId: string;
  data: unknown;
  appId: string | null;
  bookingId: number;
}

/**
 * Minimal webhook shape for URL reservation check
 * Used to check if a subscriber URL is already in use within a scope
 */
export interface WebhookForReservationCheck {
  id: string;
  subscriberUrl: string;
  teamId: number | null;
  userId: number | null;
  eventTypeId: number | null;
  platform: boolean;
}

// Legacy types moved from sendPayload.ts for backward compatibility
export type EventTypeInfo = {
  eventTitle?: string | null;
  eventDescription?: string | null;
  requiresConfirmation?: boolean | null;
  price?: number | null;
  currency?: string | null;
  length?: number | null;
};

export type UTCOffset = {
  utcOffset?: number | null;
};

export type WithUTCOffsetType<T> = T & {
  user?: Person & UTCOffset;
} & {
  organizer?: Person & UTCOffset;
} & {
  attendees?: (Person & UTCOffset)[];
};

export type BookingNoShowUpdatedPayload = {
  message: string;
  bookingUid: string;
  bookingId?: number;
  attendees: { email: string; noShow: boolean }[];
};

export type TranscriptionGeneratedPayload = {
  downloadLinks?: {
    transcription: TGetTranscriptAccessLink["transcription"];
    recording: string;
  };
};

export type OOOEntryPayloadType = {
  oooEntry: {
    id: number;
    start: string;
    end: string;
    createdAt: string;
    updatedAt: string;
    notes: string | null;
    reason: {
      emoji?: string;
      reason?: string;
    };
    reasonId: number;
    user: {
      id: number;
      name: string | null;
      username: string | null;
      timeZone: string;
      email: string;
    };
    toUser: {
      id: number;
      name?: string | null;
      username?: string | null;
      timeZone?: string;
      email?: string;
    } | null;
    uuid: string;
  };
};

export type DelegationCredentialErrorPayloadType = {
  error: {
    type: string;
    message: string;
  };
  credential: {
    id: number;
    type: string;
    appId: string;
    delegationCredentialId?: string;
  };
  user: {
    id: number;
    email: string;
    organizationId?: number;
  };
};

export type EventPayloadType = CalendarEvent &
  TranscriptionGeneratedPayload &
  EventTypeInfo & {
    metadata?: { [key: string]: string | number | boolean | null };
    bookingId?: number;
    status?: string;
    smsReminderNumber?: string;
    rescheduleId?: number;
    rescheduleUid?: string;
    rescheduleStartTime?: string;
    rescheduleEndTime?: string;
    downloadLink?: string;
    paymentId?: number;
    rescheduledBy?: string;
    cancelledBy?: string;
    paymentData?: Record<string, unknown>;
    requestReschedule?: boolean;
  };

// dto/types.ts

export type BookingWebhookEventDTO =
  | BookingCreatedDTO
  | BookingCancelledDTO
  | BookingRequestedDTO
  | BookingRescheduledDTO
  | BookingPaidDTO
  | BookingPaymentInitiatedDTO
  | BookingRejectedDTO
  | BookingNoShowDTO;

/**
 * Grouped webhooks for UI display with profile and permission metadata
 */
export interface WebhookGroup {
  teamId?: number | null;
  profile: {
    slug: string | null;
    name: string | null;
    image?: string;
  };
  metadata?: {
    canModify: boolean;
    canDelete: boolean;
  };
  webhooks: Webhook[]; // Full webhook entities for UI display
}
