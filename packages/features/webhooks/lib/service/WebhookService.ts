import { getFlattenedZapierPayload } from '../getFlattenedZapierPayload';
import { createHmac } from "node:crypto";


import { WebhookTriggerEvents } from "@calcom/prisma/enums";


import type { WebhookSubscriber, WebhookDeliveryResult } from "../dto/types";
import type { WebhookPayload } from "../factory/types";
import type { ITasker, ILogger } from "../interface/infrastructure";
import type { IWebhookRepository, IWebhookService } from "../interface/services";


export class WebhookService implements IWebhookService {
  private readonly log: ILogger;


  constructor(
    private readonly repository: IWebhookRepository,
    private readonly tasker: ITasker,
    logger: ILogger
  ) {
    this.log = logger.getSubLogger({ prefix: ["[WebhookService]"] });
  }


  protected async sendWebhook(
    trigger: WebhookTriggerEvents,
    payload: WebhookPayload,
    subscriber: WebhookSubscriber
  ): Promise<WebhookDeliveryResult> {
    try {
    if (subscriber.appId === 'zapier') {
      payload = getFlattenedZapierPayload(payload) as WebhookPayload;
    }

      // TODO: Ideally we should inject this flag as well. Would be awesome when we would be able to unit test without mocking env variables too. Also with trigger.dev, this would be further worked on, so we can leave this as is for now
      if (process.env.TASKER_ENABLE_WEBHOOKS === "1") {
        return await this.scheduleWebhook(trigger, payload, subscriber);
      } else {
        return await this.sendWebhookDirectly(trigger, payload, subscriber);
      }
    } catch (error) {
      return {
        ok: false,
        status: 0,
