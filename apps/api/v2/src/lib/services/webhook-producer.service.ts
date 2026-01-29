import { Injectable } from "@nestjs/common";

import { getWebhookProducer } from "@calcom/platform-libraries";
import type { IWebhookProducerService } from "@calcom/platform-libraries";

/**
 * NestJS wrapper for the webhook producer service from the DI container.
 *
 * This allows the webhook producer to be injected into NestJS services
 * that extend base classes requiring IWebhookProducerService.
 */
@Injectable()
export class WebhookProducerService implements IWebhookProducerService {
  private readonly producer: IWebhookProducerService;

  constructor() {
    this.producer = getWebhookProducer();
  }

  queueBookingCreatedWebhook: IWebhookProducerService["queueBookingCreatedWebhook"] = (params) => {
    return this.producer.queueBookingCreatedWebhook(params);
  };

  queueBookingCancelledWebhook: IWebhookProducerService["queueBookingCancelledWebhook"] = (params) => {
    return this.producer.queueBookingCancelledWebhook(params);
  };

  queueBookingRescheduledWebhook: IWebhookProducerService["queueBookingRescheduledWebhook"] = (params) => {
    return this.producer.queueBookingRescheduledWebhook(params);
  };

  queueBookingRequestedWebhook: IWebhookProducerService["queueBookingRequestedWebhook"] = (params) => {
    return this.producer.queueBookingRequestedWebhook(params);
  };

  queueBookingRejectedWebhook: IWebhookProducerService["queueBookingRejectedWebhook"] = (params) => {
    return this.producer.queueBookingRejectedWebhook(params);
  };

  queueBookingPaymentInitiatedWebhook: IWebhookProducerService["queueBookingPaymentInitiatedWebhook"] = (
    params
  ) => {
    return this.producer.queueBookingPaymentInitiatedWebhook(params);
  };

  queueBookingPaidWebhook: IWebhookProducerService["queueBookingPaidWebhook"] = (params) => {
    return this.producer.queueBookingPaidWebhook(params);
  };

  queueBookingNoShowUpdatedWebhook: IWebhookProducerService["queueBookingNoShowUpdatedWebhook"] = (params) => {
    return this.producer.queueBookingNoShowUpdatedWebhook(params);
  };

  queueFormSubmittedWebhook: IWebhookProducerService["queueFormSubmittedWebhook"] = (params) => {
    return this.producer.queueFormSubmittedWebhook(params);
  };

  queueRecordingReadyWebhook: IWebhookProducerService["queueRecordingReadyWebhook"] = (params) => {
    return this.producer.queueRecordingReadyWebhook(params);
  };

  queueOOOCreatedWebhook: IWebhookProducerService["queueOOOCreatedWebhook"] = (params) => {
    return this.producer.queueOOOCreatedWebhook(params);
  };
}
