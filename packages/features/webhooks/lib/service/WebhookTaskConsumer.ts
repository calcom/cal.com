import type { IWebhookRepository } from "../interface/repository";
import type { ILogger } from "../interface/infrastructure";
import type { WebhookTaskPayload } from "../types/webhookTask";
import { WebhookTriggerEvents } from "@calcom/prisma/enums";

/**
 * Heavy Consumer Service for processing webhook delivery tasks.
 * 
 * DEPENDENCIES: All heavy deps (Prisma via repositories, payload builders, etc.)
 * 
 * This service:
 * 1. Receives minimal task payload from queue
 * 2. Fetches webhook subscribers from repository
 * 3. Fetches event-specific data from database (booking, form, etc.)
 * 4. Builds versioned webhook payloads
 * 5. Sends HTTP requests to subscriber URLs
 * 
 * Can be deployed to trigger.dev for scalability.
 */
export class WebhookTaskConsumer {
  private readonly log: ILogger;

  constructor(
    private readonly webhookRepository: IWebhookRepository,
    logger: ILogger
  ) {
    this.log = logger.getSubLogger({ prefix: ["[WebhookTaskConsumer]"] });
  }

  /**
   * Process a webhook delivery task from the queue.
   * 
   * @param payload - The minimal task payload (IDs only)
   * @param taskId - The task ID from Tasker
   */
  async processWebhookTask(payload: WebhookTaskPayload, taskId: string): Promise<void> {
    this.log.info("Processing webhook delivery task", {
      operationId: payload.operationId,
      taskId,
      triggerEvent: payload.triggerEvent,
      bookingUid: payload.bookingUid,
    });

    try {
      // Step 1: Fetch webhook subscribers
      const subscribers = await this.fetchSubscribers(payload);

      if (subscribers.length === 0) {
        this.log.info("No webhook subscribers found", { operationId: payload.operationId });
        return;
      }

      this.log.debug(`Found ${subscribers.length} webhook subscriber(s)`, {
        operationId: payload.operationId,
      });

      // Step 2: Fetch event-specific data based on trigger type
      const eventData = await this.fetchEventData(payload);

      if (!eventData) {
        this.log.warn("Event data not found", {
          operationId: payload.operationId,
          triggerEvent: payload.triggerEvent,
        });
        return;
      }

      // Step 3: Build and send webhooks to each subscriber
      await this.sendWebhooksToSubscribers(subscribers, eventData, payload);

      this.log.info("Webhook delivery task completed", {
        operationId: payload.operationId,
        subscriberCount: subscribers.length,
      });
    } catch (error) {
      this.log.error("Failed to process webhook delivery task", {
        operationId: payload.operationId,
        taskId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Fetch webhook subscribers based on the task payload.
   */
  private async fetchSubscribers(payload: WebhookTaskPayload) {
    return await this.webhookRepository.getSubscribers({
      triggerEvent: payload.triggerEvent,
      userId: payload.userId,
      eventTypeId: payload.eventTypeId,
      teamId: payload.teamId,
      orgId: payload.orgId,
      oAuthClientId: payload.oAuthClientId,
    });
  }

  /**
   * Fetch event-specific data from database based on trigger type.
   * 
   * TODO: Implement full data fetching logic for each event type.
   * For Phase 0, this is a scaffold showing the pattern.
   */
  private async fetchEventData(payload: WebhookTaskPayload): Promise<Record<string, unknown> | null> {
    switch (payload.triggerEvent) {
      case WebhookTriggerEvents.BOOKING_CREATED:
      case WebhookTriggerEvents.BOOKING_CANCELLED:
      case WebhookTriggerEvents.BOOKING_RESCHEDULED:
      case WebhookTriggerEvents.BOOKING_REQUESTED:
      case WebhookTriggerEvents.BOOKING_REJECTED:
      case WebhookTriggerEvents.BOOKING_PAID:
      case WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED:
      case WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED:
        return this.fetchBookingData(payload.bookingUid);

      case WebhookTriggerEvents.FORM_SUBMITTED:
        return this.fetchFormData(payload.formId);

      case WebhookTriggerEvents.RECORDING_READY:
        return this.fetchRecordingData(payload.recordingId);

      case WebhookTriggerEvents.OOO_CREATED:
        return this.fetchOOOData(payload.oooEntryId);

      default:
        this.log.warn("Unknown trigger event type", { triggerEvent: payload.triggerEvent });
        return null;
    }
  }

  /**
   * Fetch booking data from database.
   * 
   * TODO: Implement using BookingRepository (to be injected).
   * For Phase 0, this is a placeholder.
   */
  private async fetchBookingData(bookingUid?: string): Promise<Record<string, unknown> | null> {
    if (!bookingUid) {
      this.log.warn("Missing bookingUid for booking webhook");
      return null;
    }

    // TODO: Fetch from BookingRepository
    // const booking = await this.bookingRepository.findByUid(bookingUid);
    // const eventType = await this.eventTypeRepository.findById(booking.eventTypeId);
    // return { booking, eventType, ... };

    this.log.debug("Booking data fetch not implemented yet (Phase 0 scaffold)", { bookingUid });
    return { bookingUid, _scaffold: true };
  }

  /**
   * Fetch form data from database.
   * 
   * TODO: Implement using FormRepository.
   */
  private async fetchFormData(formId?: string): Promise<Record<string, unknown> | null> {
    if (!formId) {
      this.log.warn("Missing formId for form webhook");
      return null;
    }

    // TODO: Implement
    this.log.debug("Form data fetch not implemented yet (Phase 0 scaffold)", { formId });
    return { formId, _scaffold: true };
  }

  /**
   * Fetch recording data from database.
   * 
   * TODO: Implement using RecordingRepository.
   */
  private async fetchRecordingData(recordingId?: string): Promise<Record<string, unknown> | null> {
    if (!recordingId) {
      this.log.warn("Missing recordingId for recording webhook");
      return null;
    }

    // TODO: Implement
    this.log.debug("Recording data fetch not implemented yet (Phase 0 scaffold)", { recordingId });
    return { recordingId, _scaffold: true };
  }

  /**
   * Fetch OOO data from database.
   * 
   * TODO: Implement using OOORepository.
   */
  private async fetchOOOData(oooEntryId?: number): Promise<Record<string, unknown> | null> {
    if (!oooEntryId) {
      this.log.warn("Missing oooEntryId for OOO webhook");
      return null;
    }

    // TODO: Implement
    this.log.debug("OOO data fetch not implemented yet (Phase 0 scaffold)", { oooEntryId });
    return { oooEntryId, _scaffold: true };
  }

  /**
   * Build webhook payloads and send to each subscriber.
   * 
   * TODO: Implement payload building using PayloadBuilders and HTTP sending.
   * For Phase 0, this is a scaffold showing the pattern.
   */
  private async sendWebhooksToSubscribers(
    subscribers: unknown[],
    eventData: Record<string, unknown>,
    payload: WebhookTaskPayload
  ): Promise<void> {
    // TODO: For each subscriber:
    // 1. Build versioned payload using PayloadBuilders
    // 2. Send HTTP request to subscriber.subscriberUrl
    // 3. Handle retries/failures
    // 4. Log delivery status

    this.log.debug("Webhook sending not implemented yet (Phase 0 scaffold)", {
      subscriberCount: subscribers.length,
      triggerEvent: payload.triggerEvent,
    });

    // This will be implemented when we add PayloadBuilders and HTTP client dependencies
  }
}
