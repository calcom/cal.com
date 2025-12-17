import type { WebhookTriggerEvents } from "@calcom/prisma/enums";

/**
 * Lightweight Producer Service for queueing webhook delivery tasks.
 * 
 * This service has NO heavy dependencies (no Prisma, no repositories).
 * It only queues tasks via Tasker, which will be processed by WebhookTaskConsumer.
 * 
 * This allows the producer to stay in the main app while the consumer
 * can be deployed to trigger.dev for scalability.
 */
export interface IWebhookProducerService {
  /**
   * Queue a webhook delivery task for BOOKING_CREATED event
   */
  queueBookingCreatedWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_CANCELLED event
   */
  queueBookingCancelledWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_RESCHEDULED event
   */
  queueBookingRescheduledWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_CONFIRMED event
   */
  queueBookingConfirmedWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_REJECTED event
   */
  queueBookingRejectedWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_PAYMENT_INITIATED event
   */
  queueBookingPaymentInitiatedWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_PAID event
   */
  queueBookingPaidWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_NO_SHOW_UPDATED event
   */
  queueBookingNoShowUpdatedWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for FORM_SUBMITTED event
   */
  queueFormSubmittedWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for RECORDING_READY event
   */
  queueRecordingReadyWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for OOO_CREATED event
   */
  queueOOOCreatedWebhook(params: QueueWebhookParams): Promise<void>;

  /**
   * Generic method to queue any webhook event
   */
  queueWebhook(params: QueueWebhookParams): Promise<void>;
}

/**
 * Parameters for queueing a webhook delivery task.
 * 
 * This is a MINIMAL payload - only what's needed to identify the entities.
 * The Consumer will fetch full data from database.
 */
export interface QueueWebhookParams {
  /** Unique identifier for this webhook operation (generated if not provided) */
  operationId?: string;

  /** The webhook trigger event type */
  triggerEvent: WebhookTriggerEvents;

  /** Booking UID (for booking-related webhooks) */
  bookingUid?: string;

  /** Event Type ID */
  eventTypeId?: number;

  /** Team ID */
  teamId?: number | null;

  /** User ID */
  userId?: number;

  /** Organization ID */
  orgId?: number;

  /** Form ID (for form webhooks) */
  formId?: string;

  /** Recording ID (for recording webhooks) */
  recordingId?: string;

  /** OOO Entry ID (for OOO webhooks) */
  oooEntryId?: number;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;

  /** Additional context data (kept minimal) */
  metadata?: Record<string, unknown>;
}
