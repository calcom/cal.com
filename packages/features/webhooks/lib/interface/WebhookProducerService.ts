import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

/**
 * Base parameters common to all webhook queue operations
 */
interface BaseQueueWebhookParams {
  /** Unique identifier for this webhook operation (generated if not provided) */
  operationId?: string;
  /** Additional context data (kept minimal) */
  metadata?: Record<string, unknown>;
}

/**
 * Parameters for queueing booking-related webhooks
 * Used for: BOOKING_CREATED, BOOKING_CANCELLED, BOOKING_RESCHEDULED,
 *           BOOKING_REQUESTED, BOOKING_REJECTED, BOOKING_NO_SHOW_UPDATED
 */
export interface QueueBookingWebhookParams extends BaseQueueWebhookParams {
  bookingUid: string;
  eventTypeId?: number;
  teamId?: number | null;
  userId?: number;
  orgId?: number;
  oAuthClientId?: string | null;
  /** Platform client ID (for platform webhook subscribers) */
  platformClientId?: string | null;
  /** Platform reschedule URL */
  platformRescheduleUrl?: string | null;
  /** Platform cancel URL */
  platformCancelUrl?: string | null;
  /** Platform booking URL */
  platformBookingUrl?: string | null;
}

/**
 * Parameters for queueing payment-related webhooks
 * Used for: BOOKING_PAYMENT_INITIATED, BOOKING_PAID
 */
export interface QueuePaymentWebhookParams extends BaseQueueWebhookParams {
  /** Booking UID (required) */
  bookingUid: string;

  /** Event Type ID */
  eventTypeId?: number;

  /** Team ID */
  teamId?: number | null;

  /** User ID */
  userId?: number;

  /** Organization ID */
  orgId?: number;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;
}

/**
 * Parameters for queueing form-related webhooks
 * Used for: FORM_SUBMITTED
 */
export interface QueueFormWebhookParams extends BaseQueueWebhookParams {
  /** Form ID (required) */
  formId: string;

  /** Team ID */
  teamId?: number | null;

  /** User ID */
  userId?: number;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;
}

/**
 * Parameters for queueing recording-related webhooks
 * Used for: RECORDING_READY, RECORDING_TRANSCRIPTION_GENERATED
 */
export interface QueueRecordingWebhookParams extends BaseQueueWebhookParams {
  /** Recording ID (required) */
  recordingId: string;

  /** Booking UID (required) */
  bookingUid: string;

  /** Event Type ID */
  eventTypeId?: number;

  /** Team ID */
  teamId?: number | null;

  /** User ID */
  userId?: number;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;
}

/**
 * Parameters for queueing OOO-related webhooks
 * Used for: OOO_CREATED
 */
export interface QueueOOOWebhookParams extends BaseQueueWebhookParams {
  /** OOO Entry ID (required) */
  oooEntryId: number;

  /** User ID (required) */
  userId: number;

  /** Team ID */
  teamId?: number | null;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;
}

/**
 * Trigger events that can be queued via queueBookingWebhook.
 */
export type QueueBookingTriggerEvent =
  | typeof WebhookTriggerEvents.BOOKING_CREATED
  | typeof WebhookTriggerEvents.BOOKING_RESCHEDULED
  | typeof WebhookTriggerEvents.BOOKING_CANCELLED
  | typeof WebhookTriggerEvents.BOOKING_REJECTED
  | typeof WebhookTriggerEvents.BOOKING_REQUESTED
  | typeof WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED;

export interface IWebhookProducerService {
  queueBookingWebhook(
    triggerEvent: QueueBookingTriggerEvent,
    params: QueueBookingWebhookParams
  ): Promise<void>;
  /**
   * Queue a webhook delivery task for BOOKING_CANCELLED event
   */
  queueBookingCancelledWebhook(params: QueueBookingWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_REJECTED event
   */
  queueBookingRejectedWebhook(params: QueueBookingWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_PAYMENT_INITIATED event
   */
  queueBookingPaymentInitiatedWebhook(params: QueuePaymentWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_PAID event
   */
  queueBookingPaidWebhook(params: QueuePaymentWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_NO_SHOW_UPDATED event
   */
  queueBookingNoShowUpdatedWebhook(params: QueueBookingWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for FORM_SUBMITTED event
   */
  queueFormSubmittedWebhook(params: QueueFormWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for RECORDING_READY event
   */
  queueRecordingReadyWebhook(params: QueueRecordingWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for OOO_CREATED event
   */
  queueOOOCreatedWebhook(params: QueueOOOWebhookParams): Promise<void>;
}
