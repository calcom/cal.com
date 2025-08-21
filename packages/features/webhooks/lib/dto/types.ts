import type { Payment } from "@prisma/client";

import type { TGetTranscriptAccessLink } from "@calcom/app-store/dailyvideo/zod";
import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
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
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
  } | null;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    startTime: Date;
    smsReminderNumber?: string | null;
  };
  status: "ACCEPTED" | "PENDING";
  metadata?: { [key: string]: any };
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
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
  } | null;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  };
  cancelledBy?: string;
  cancellationReason?: string;
}

export interface BookingRejectedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_REJECTED;
  evt: CalendarEvent;
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
  } | null;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
    smsReminderNumber?: string | null;
  };
}

export interface BookingRequestedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_REQUESTED;
  evt: CalendarEvent;
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
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
}

export interface BookingRescheduledDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_RESCHEDULED;
  evt: CalendarEvent;
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
  } | null;
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
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
  } | null;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
  paymentId?: number;
  paymentData?: any;
}

export interface BookingPaymentInitiatedDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED;
  evt: CalendarEvent;
  eventType: {
    id: number;
    title: string;
    description: string | null;
    requiresConfirmation: boolean;
    price: number;
    currency: string;
    length: number;
  } | null;
  booking: {
    id: number;
    eventTypeId: number | null;
    userId: number | null;
  };
  paymentId?: number;
  paymentData?: any;
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
    data: Record<string, any>;
  };
}

// Recording-specific DTOs
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

// Form-specific DTOs
export interface FormSubmittedNoEventDTO extends BaseEventDTO {
  triggerEvent: typeof WebhookTriggerEvents.FORM_SUBMITTED_NO_EVENT;
  form: {
    id: string;
    name: string;
  };
  response: {
    id: number;
    data: Record<string, any>;
  };
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
  | TranscriptionGeneratedDTO;

export interface WebhookSubscriber {
  id: string;
  subscriberUrl: string;
  payloadTemplate: string | null;
  appId: string | null;
  secret: string | null;
  time?: number | null;
  timeUnit?: string | null;
  eventTriggers: WebhookTriggerEvents[];
}

export interface WebhookDeliveryResult {
  ok: boolean;
  status: number;
  message?: string;
  duration?: number;
  subscriberUrl: string;
  webhookId: string;
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
    paymentData?: Payment;
  };
