import type { IWebhookRepository } from "../interface/IWebhookRepository";
import type {
  IBookingWebhookService,
  IFormWebhookService,
  IOOOWebhookService,
  IRecordingWebhookService,
  IWebhookService,
} from "../interface/services";
import type { IWebhookProducerService } from "../interface/WebhookProducerService";
import type { IWebhookNotifier } from "../interface/webhook";
import type { WebhookTaskConsumer } from "../service/WebhookTaskConsumer";

/**
 * WebhookFeature Facade
 *
 * Unified, type-safe API surface for the entire Webhooks feature.
 *
 * This facade provides access to:
 * - Producer: Lightweight service for queueing webhook tasks
 * - Consumer: Heavy service for processing webhook tasks
 * - Core: Low-level webhook service (repository, processing, scheduling)
 * - Event-specific services: Booking, Form, Recording, OOO webhooks
 * - Notifier: High-level notification handler
 * - Repository: Direct data access (use sparingly)
 *
 * Usage (recommended):
 * ```typescript
 * import { getWebhookFeature } from "@calcom/features/webhooks/di";
 *
 * const webhooks = getWebhookFeature();
 *
 * // Queue a webhook (lightweight, fast)
 * await webhooks.producer.queueBookingCreatedWebhook({
 *   triggerEvent: WebhookTriggerEvents.BOOKING_CREATED,
 *   bookingUid: booking.uid,
 *   eventTypeId: eventType.id,
 * });
 *
 * // Or use event-specific services (direct emission)
 * await webhooks.booking.emitBookingCreated({
 *   booking,
 *   eventType,
 *   evt,
 * });
 * ```
 */
export interface WebhookFeature {
  /**
   * Producer Service (lightweight)
   *
   * Queue webhook delivery tasks. No heavy dependencies.
   * Use this for async webhook processing via task queue.
   */
  producer: IWebhookProducerService;

  /**
   * Consumer Service (heavy)
   *
   * Process webhook delivery tasks from queue.
   * Fetches data, builds payloads, sends HTTP requests.
   *
   * Note: Typically called by task queue handler, not directly.
   */
  consumer: WebhookTaskConsumer;

  /**
   * Core Webhook Service
   *
   * Low-level webhook operations: get subscribers, process webhooks, schedule.
   * Use this for advanced/custom webhook logic.
   */
  core: IWebhookService;

  /**
   * Booking Webhook Service
   *
   * Handle all booking-related webhook events:
   * - BOOKING_CREATED
   * - BOOKING_REQUESTED (pending confirmation)
   * - BOOKING_RESCHEDULED
   * - BOOKING_CANCELLED
   * - BOOKING_REJECTED
   * - BOOKING_PAYMENT_INITIATED
   * - BOOKING_PAID
   * - BOOKING_NO_SHOW_UPDATED
   */
  booking: IBookingWebhookService;

  /**
   * Form Webhook Service
   *
   * Handle form-related webhook events:
   * - FORM_SUBMITTED
   * - FORM_SUBMITTED_NO_EVENT
   */
  form: IFormWebhookService;

  /**
   * Recording Webhook Service
   *
   * Handle recording-related webhook events:
   * - RECORDING_READY
   * - RECORDING_TRANSCRIPTION_GENERATED
   */
  recording: IRecordingWebhookService;

  /**
   * Out-of-Office (OOO) Webhook Service
   *
   * Handle OOO-related webhook events:
   * - OOO_CREATED
   */
  ooo: IOOOWebhookService;

  /**
   * Webhook Notifier
   *
   * High-level webhook notification handler.
   * Orchestrates payload building and delivery.
   */
  notifier: IWebhookNotifier;

  /**
   * Webhook Repository
   *
   * @internal
   * Direct data access for webhooks.
   * Use sparingly - prefer services for business logic.
   * Only exposed for advanced use cases and testing.
   */
  repository: IWebhookRepository;
}
