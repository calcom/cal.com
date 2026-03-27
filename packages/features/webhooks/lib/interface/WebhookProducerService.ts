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
 * Parameters for queueing meeting-related webhooks (MEETING_STARTED, MEETING_ENDED)
 *
 * These webhooks are delayed - they fire at the meeting start/end time.
 */
export interface QueueMeetingWebhookParams extends BaseQueueWebhookParams {
  /** Booking ID (required for scheduling) */
  bookingId: number;

  /** Booking UID (required) */
  bookingUid: string;

  /** Meeting start time (ISO string) */
  startTime: string;

  /** Meeting end time (ISO string) */
  endTime: string;

  /** Event Type ID */
  eventTypeId?: number;

  /** Team ID */
  teamId?: number | null;

  /** User ID */
  userId?: number | null;

  /** Organization ID */
  orgId?: number;

  /** OAuth Client ID (for platform webhooks) */
  oAuthClientId?: string | null;
}

/**
 * Parameters for cancelling meeting webhooks
 */
export interface CancelMeetingWebhookParams {
  /** Booking ID */
  bookingId: number;

  /** Booking UID */
  bookingUid: string;
}

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
  queueBookingCreatedWebhook(params: QueueBookingWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_CANCELLED event
   */
  queueBookingCancelledWebhook(params: QueueBookingWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_RESCHEDULED event
   */
  queueBookingRescheduledWebhook(params: QueueBookingWebhookParams): Promise<void>;

  /**
   * Queue a webhook delivery task for BOOKING_REQUESTED event
   *
   * Note: This fires when bookings require confirmation (status = PENDING)
   */
  queueBookingRequestedWebhook(params: QueueBookingWebhookParams): Promise<void>;

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

  /**
   * Queue a delayed webhook delivery task for MEETING_STARTED event.
   * The webhook fires at the meeting start time.
   */
  queueMeetingStartedWebhook(params: QueueMeetingWebhookParams): Promise<void>;

  /**
   * Queue a delayed webhook delivery task for MEETING_ENDED event.
   * The webhook fires at the meeting end time.
   */
  queueMeetingEndedWebhook(params: QueueMeetingWebhookParams): Promise<void>;

  /**
   * Cancel previously scheduled MEETING_STARTED and MEETING_ENDED webhooks for a booking.
   */
  cancelMeetingWebhooks(params: CancelMeetingWebhookParams): Promise<void>;
}
