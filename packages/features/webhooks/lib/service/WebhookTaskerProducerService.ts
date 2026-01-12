import { v4 as uuidv4 } from "uuid";

import { WebhookTriggerEvents } from "@calcom/prisma/enums";

import type { ITasker, ILogger } from "../interface/infrastructure";
import type { IWebhookProducerService, QueueWebhookParams } from "../interface/WebhookProducerService";

/**
 * Lightweight Producer Service for webhook delivery.
 * 
 * DEPENDENCIES: Only Tasker and Logger (no Prisma, no repositories)
 * 
 * This service queues minimal webhook tasks to be processed by WebhookTaskConsumer.
 * The consumer handles the heavy lifting (DB queries, payload building, HTTP delivery).
 */
export class WebhookTaskerProducerService implements IWebhookProducerService {
  private readonly log: ILogger;

  constructor(
    private readonly tasker: ITasker,
    logger: ILogger
  ) {
    this.log = logger.getSubLogger({ prefix: ["[WebhookTaskerProducerService]"] });
  }

  async queueBookingCreatedWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.BOOKING_CREATED });
  }

  async queueBookingCancelledWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.BOOKING_CANCELLED });
  }

  async queueBookingRescheduledWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.BOOKING_RESCHEDULED });
  }

  /**
   * Queue a webhook for confirmed bookings.
   * 
   * Note: Uses BOOKING_REQUESTED trigger event, as this is the webhook event
   * that fires when bookings are confirmed/requested. 
   */
  async queueBookingConfirmedWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.BOOKING_REQUESTED });
  }

  async queueBookingRejectedWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.BOOKING_REJECTED });
  }

  async queueBookingPaymentInitiatedWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED });
  }

  async queueBookingPaidWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.BOOKING_PAID });
  }

  async queueBookingNoShowUpdatedWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED });
  }

  async queueFormSubmittedWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED });
  }

  async queueRecordingReadyWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.RECORDING_READY });
  }

  async queueOOOCreatedWebhook(params: QueueWebhookParams): Promise<void> {
    await this.queueWebhook({ ...params, triggerEvent: WebhookTriggerEvents.OOO_CREATED });
  }

  /**
   * Generic method to queue webhook delivery task.
   * 
   * This creates a lightweight task with minimal payload.
   * The Consumer will fetch full data from database when processing.
   */
  async queueWebhook(params: QueueWebhookParams): Promise<void> {
    const operationId = params.operationId || uuidv4();

    this.log.info("Queueing webhook delivery task", {
      operationId,
      triggerEvent: params.triggerEvent,
      bookingUid: params.bookingUid,
      eventTypeId: params.eventTypeId,
    });

    try {
      // Create minimal task payload (IDs only, no heavy data)
      const taskPayload = {
        operationId,
        triggerEvent: params.triggerEvent,
        bookingUid: params.bookingUid,
        eventTypeId: params.eventTypeId,
        teamId: params.teamId,
        userId: params.userId,
        orgId: params.orgId,
        formId: params.formId,
        recordingId: params.recordingId,
        oooEntryId: params.oooEntryId,
        oAuthClientId: params.oAuthClientId,
        metadata: params.metadata,
        timestamp: new Date().toISOString(),
      };

      // Queue the task (to be processed by WebhookTaskConsumer)
      await this.tasker.create("webhookDelivery", taskPayload);

      this.log.info("Webhook delivery task queued successfully", { operationId });
    } catch (error) {
      this.log.error("Failed to queue webhook delivery task", {
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
