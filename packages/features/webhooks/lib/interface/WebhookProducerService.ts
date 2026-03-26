import type { WebhookTriggerEvents } from "@calcom/prisma/enums";
import type { RecordingTriggerEvents } from "../factory/versioned/PayloadBuilderFactory";
import type { RoutingFormFallbackHitMetadata } from "../types/webhookTask";

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
  /** Non-PII seat reference UUID; lets the consumer resolve the correct seat without email-matching */
  attendeeSeatId?: string;
  /** The specific hashed-link UUID used when booking via a private link */
  hashedLink?: string | null;
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

  /** Organization ID */
  orgId?: number;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;

  /** Batch processor job ID (for RECORDING_TRANSCRIPTION_GENERATED — used by the data fetcher to resolve transcription links) */
  batchProcessorJobId?: string;
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

  /** Team IDs (user can be in multiple teams) */
  teamIds?: number[];

  /** Organization ID */
  orgId?: number | null;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;
}

/**
 * Parameters for queueing routing form fallback hit webhooks
 * Used for: ROUTING_FORM_FALLBACK_HIT
 */
export interface QueueRoutingFormFallbackHitWebhookParams extends Omit<BaseQueueWebhookParams, "metadata"> {
  /** Form ID (required) */
  formId: string;

  /** Response ID (required) */
  responseId: number;

  /** Team ID */
  teamId?: number | null;

  /** User ID */
  userId?: number;

  /** Organization ID */
  orgId?: number;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;

  /** PII-free metadata (fallbackAction only); fetcher resolves responses/formName from DB */
  metadata: RoutingFormFallbackHitMetadata;
}

/**
 * Parameters for queueing wrong assignment report webhooks
 * Used for: WRONG_ASSIGNMENT_REPORT
 */
export interface QueueWrongAssignmentWebhookParams extends BaseQueueWebhookParams {
  bookingUid: string;
  wrongAssignmentReportId: string;
  userId?: number | null;
  teamId?: number | null;
  orgId?: number | null;
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
   * Queue a webhook delivery task for recording-related events
   * (RECORDING_READY, RECORDING_TRANSCRIPTION_GENERATED)
   */
  queueRecordingWebhook(
    triggerEvent: RecordingTriggerEvents,
    params: QueueRecordingWebhookParams
  ): Promise<void>;

  /**
   * Queue a webhook delivery task for OOO_CREATED event
   */
  queueOOOCreatedWebhook(params: QueueOOOWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for ROUTING_FORM_FALLBACK_HIT event
   */
  queueRoutingFormFallbackHitWebhook(params: QueueRoutingFormFallbackHitWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for WRONG_ASSIGNMENT_REPORT event
   */
  queueWrongAssignmentReportWebhook(params: QueueWrongAssignmentWebhookParams): Promise<void>;
}
