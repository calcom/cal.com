import { WebhookTriggerEvents } from "@calcom/prisma/enums";
import { v4 as uuidv4 } from "uuid";
import type { BookingTriggerEvents, PaymentTriggerEvents } from "../factory/versioned/PayloadBuilderFactory";
import type { ILogger } from "../interface/infrastructure";
import type {
  IWebhookProducerService,
  QueueBookingWebhookParams,
  QueueFormWebhookParams,
  QueueOOOWebhookParams,
  QueuePaymentWebhookParams,
  QueueRecordingWebhookParams,
} from "../interface/WebhookProducerService";
import type { WebhookTasker } from "../tasker/WebhookTasker";
import type { WebhookTaskPayload } from "../types/webhookTask";

/**
 * Lightweight Producer Service for webhook delivery.
 *
 * DEPENDENCIES: Only Tasker and Logger (no Prisma, no repositories)
 *
 * This service queues minimal webhook tasks to be processed by WebhookTaskConsumer.
 * The consumer handles the heavy lifting (DB queries, payload building, HTTP delivery).
 */
/**
 * Dependencies for WebhookTaskerProducerService
 */
export interface IWebhookTaskerProducerServiceDeps {
  webhookTasker: WebhookTasker;
  logger: ILogger;
}

export class WebhookTaskerProducerService implements IWebhookProducerService {
  private readonly log: ILogger;

  constructor(private readonly deps: IWebhookTaskerProducerServiceDeps) {
    this.log = deps.logger.getSubLogger({ prefix: ["[WebhookTaskerProducerService]"] });
  }

  async queueBookingCreatedWebhook(params: QueueBookingWebhookParams): Promise<void> {
    await this.queueBookingWebhook(WebhookTriggerEvents.BOOKING_CREATED, params);
  }

  async queueBookingCancelledWebhook(params: QueueBookingWebhookParams): Promise<void> {
    await this.queueBookingWebhook(WebhookTriggerEvents.BOOKING_CANCELLED, params);
  }

  async queueBookingRescheduledWebhook(params: QueueBookingWebhookParams): Promise<void> {
    await this.queueBookingWebhook(WebhookTriggerEvents.BOOKING_RESCHEDULED, params);
  }

  /**
   * Queue a webhook for requested bookings.
   *
   * This fires when bookings require confirmation (status = PENDING).
   */
  async queueBookingRequestedWebhook(params: QueueBookingWebhookParams): Promise<void> {
    await this.queueBookingWebhook(WebhookTriggerEvents.BOOKING_REQUESTED, params);
  }

  async queueBookingRejectedWebhook(params: QueueBookingWebhookParams): Promise<void> {
    await this.queueBookingWebhook(WebhookTriggerEvents.BOOKING_REJECTED, params);
  }

  async queueBookingPaymentInitiatedWebhook(params: QueuePaymentWebhookParams): Promise<void> {
    await this.queuePaymentWebhook(WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED, params);
  }

  async queueBookingPaidWebhook(params: QueuePaymentWebhookParams): Promise<void> {
    await this.queuePaymentWebhook(WebhookTriggerEvents.BOOKING_PAID, params);
  }

  async queueBookingNoShowUpdatedWebhook(params: QueueBookingWebhookParams): Promise<void> {
    await this.queueBookingWebhook(WebhookTriggerEvents.BOOKING_NO_SHOW_UPDATED, params);
  }

  async queueFormSubmittedWebhook(params: QueueFormWebhookParams): Promise<void> {
    const operationId = params.operationId || uuidv4();

    this.log.debug("Queueing form webhook task", {
      operationId,
      triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
      formId: params.formId,
    });

    const taskPayload: WebhookTaskPayload = {
      operationId,
      triggerEvent: WebhookTriggerEvents.FORM_SUBMITTED,
      formId: params.formId,
      teamId: params.teamId,
      userId: params.userId,
      oAuthClientId: params.oAuthClientId,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    await this.queueTask(operationId, taskPayload);
  }

  async queueRecordingReadyWebhook(params: QueueRecordingWebhookParams): Promise<void> {
    const operationId = params.operationId || uuidv4();

    this.log.debug("Queueing recording webhook task", {
      operationId,
      triggerEvent: WebhookTriggerEvents.RECORDING_READY,
      recordingId: params.recordingId,
      bookingUid: params.bookingUid,
    });

    const taskPayload: WebhookTaskPayload = {
      operationId,
      triggerEvent: WebhookTriggerEvents.RECORDING_READY,
      recordingId: params.recordingId,
      bookingUid: params.bookingUid,
      eventTypeId: params.eventTypeId,
      teamId: params.teamId,
      userId: params.userId,
      oAuthClientId: params.oAuthClientId,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    await this.queueTask(operationId, taskPayload);
  }

  async queueOOOCreatedWebhook(params: QueueOOOWebhookParams): Promise<void> {
    const operationId = params.operationId || uuidv4();

    this.log.debug("Queueing OOO webhook task", {
      operationId,
      triggerEvent: WebhookTriggerEvents.OOO_CREATED,
      oooEntryId: params.oooEntryId,
      userId: params.userId,
    });

    const taskPayload: WebhookTaskPayload = {
      operationId,
      triggerEvent: WebhookTriggerEvents.OOO_CREATED,
      oooEntryId: params.oooEntryId,
      userId: params.userId,
      teamId: params.teamId,
      oAuthClientId: params.oAuthClientId,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    await this.queueTask(operationId, taskPayload);
  }

  /**
   * Internal helper to queue booking-related webhooks
   */
  private async queueBookingWebhook(
    triggerEvent: Exclude<
      BookingTriggerEvents,
      typeof WebhookTriggerEvents.BOOKING_PAYMENT_INITIATED | typeof WebhookTriggerEvents.BOOKING_PAID
    >,
    params: QueueBookingWebhookParams
  ): Promise<void> {
    const operationId = params.operationId || uuidv4();

    this.log.debug("Queueing booking webhook task", {
      operationId,
      triggerEvent,
      bookingUid: params.bookingUid,
      eventTypeId: params.eventTypeId,
    });

    const taskPayload: WebhookTaskPayload = {
      operationId,
      triggerEvent,
      bookingUid: params.bookingUid,
      eventTypeId: params.eventTypeId,
      teamId: params.teamId,
      userId: params.userId,
      orgId: params.orgId,
      oAuthClientId: params.oAuthClientId,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    await this.queueTask(operationId, taskPayload);
  }

  /**
   * Internal helper to queue payment-related webhooks
   */
  private async queuePaymentWebhook(
    triggerEvent: PaymentTriggerEvents,
    params: QueuePaymentWebhookParams
  ): Promise<void> {
    const operationId = params.operationId || uuidv4();

    this.log.debug("Queueing payment webhook task", {
      operationId,
      triggerEvent,
      bookingUid: params.bookingUid,
    });

    const taskPayload: WebhookTaskPayload = {
      operationId,
      triggerEvent,
      bookingUid: params.bookingUid,
      eventTypeId: params.eventTypeId,
      teamId: params.teamId,
      userId: params.userId,
      orgId: params.orgId,
      oAuthClientId: params.oAuthClientId,
      metadata: params.metadata,
      timestamp: new Date().toISOString(),
    };

    await this.queueTask(operationId, taskPayload);
  }

  /**
   * Internal helper to queue task via WebhookTasker
   *
   * The WebhookTasker automatically selects the appropriate execution mode:
   * - Production: Queues to Trigger.dev for background processing
   * - E2E Tests: Executes immediately via WebhookSyncTasker
   */
  private async queueTask(operationId: string, taskPayload: WebhookTaskPayload): Promise<void> {
    try {
      const result = await this.deps.webhookTasker.deliverWebhook(taskPayload);
      this.log.debug("Webhook delivery task queued", { operationId, taskId: result.taskId });
    } catch (error) {
      this.log.error("Failed to queue webhook delivery task", {
        operationId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}
